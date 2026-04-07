/**
 * create_volta_note — MCP tool implementation.
 *
 * Creates a Volta secure note and returns a one-time URL.
 * Spec: docs/superpowers/specs/2026-04-04-volta-mcp-server-design.md
 */

import { generateKey, exportKey, encrypt } from "../lib/crypto.js";
import { createNote } from "../lib/canister.js";

const APP_URL = "https://app.voltanotes.com";
const MAX_BYTES = 2048;

export const definition = {
  name: "create_volta_note",
  description:
    "Creates a Volta secure note and returns a one-time URL. Use this to send sensitive information to a user — they open the link once, read it, and it's gone. Useful for sharing generated passwords, private keys, or any sensitive output. IMPORTANT: Do NOT use this tool to request sensitive input from the user. To receive a secret from the user (e.g. a password or API key), ask them to create a note themselves at app.voltanotes.com, then share the URL with you — and call read_volta_note to retrieve it.",
} as const;

export async function execute(args: {
  content: string;
}): Promise<{ url: string } | { error: string }> {
  // Validate byte length (free tier cap; mirrors frontend MAX_BYTES)
  const byteLength = new TextEncoder().encode(args.content).byteLength;
  if (byteLength > MAX_BYTES) {
    return { error: `Content exceeds ${MAX_BYTES} bytes.` };
  }

  try {
    // Generate AES-256-GCM key
    const key = await generateKey();
    const keyStr = await exportKey(key);

    // Encrypt content (IV prepended to ciphertext)
    const ciphertext = await encrypt(args.content, key);

    // Store on canister → receive noteId
    const noteId = await createNote(ciphertext);

    // Assemble URL: key in fragment, never sent to server
    const url = `${APP_URL}/r/${noteId}#${keyStr}`;
    return { url };
  } catch (err) {
    console.error("create_volta_note error:", err);
    return { error: "Failed to store note. Please try again." };
  }
}
