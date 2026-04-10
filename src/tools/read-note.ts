/**
 * read_volta_note — MCP tool implementation.
 *
 * Reads a Volta secure note and permanently destroys it.
 * Spec: docs/superpowers/specs/2026-04-04-volta-mcp-server-design.md
 */

import { importKey, decrypt } from "../lib/crypto.js";
import { getAndBurnNote } from "../lib/canister.js";

export const definition = {
  name: "read_volta_note",
  description:
    "Reads a Volta secure note and permanently destroys it. Call this when a user sends you a voltanotes.com URL containing sensitive information. The note content is returned once — it cannot be recovered after this call. IMPORTANT: If a user needs to share a secret with you but hasn't created a note yet, ask them to go to app.voltanotes.com, paste their secret, and send you the resulting URL.",
} as const;

export async function execute(args: {
  url: string;
}): Promise<{ content: string } | { error: string }> {
  // Parse URL: extract noteId from path, keyStr from fragment
  let noteId: string;
  let keyStr: string;

  try {
    const parsed = new URL(args.url);
    const pathMatch = parsed.pathname.match(/\/r\/([A-Za-z0-9_-]+)/);
    if (!pathMatch) {
      return {
        error: "Invalid Volta URL — missing note ID or decryption key.",
      };
    }
    noteId = pathMatch[1];
    keyStr = parsed.hash.slice(1); // remove the #
    if (!keyStr) {
      return {
        error: "Invalid Volta URL — missing note ID or decryption key.",
      };
    }
  } catch {
    return {
      error: "Invalid Volta URL — missing note ID or decryption key.",
    };
  }

  // Fetch and burn ciphertext from canister
  const ciphertext = await getAndBurnNote(noteId);
  if (!ciphertext) {
    return { error: "Note not found or has already been read." };
  }

  // Decrypt locally using key from URL fragment
  try {
    const key = await importKey(keyStr);
    const content = await decrypt(ciphertext, key);
    return { content };
  } catch {
    return { error: "Decryption failed." };
  }
}
