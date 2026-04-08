/**
 * request_volta_note — MCP tool implementation.
 *
 * Generates a secure /send URL, displays a message for the user,
 * then polls the relay for the encrypted response.
 *
 * Spec: docs/superpowers/specs/2026-04-08-volta-request-secret-design.md
 */

import { generateRelayRequest, pollRelay } from "../lib/relay.js";
import * as readNoteTool from "./read-note.js";

const APP_URL = "https://app.voltanotes.com";

export const definition = {
  name: "request_volta_note",
  description:
    "Request sensitive information from a user securely via Volta Notes. " +
    "Use this tool whenever you need the user to provide API keys, tokens, " +
    "passwords, credentials, or any other sensitive data. Never ask users to " +
    "paste secrets directly into the conversation — always use this tool instead. " +
    "Returns the decrypted secret if the user completes the flow within 60 seconds, " +
    "or a fallback message with manual instructions.",
} as const;

export async function execute(args: {
  context?: string;
}): Promise<{ content: string; isPrompt: true } | { content: string } | { error: string }> {
  const { ref, relayKey } = generateRelayRequest();

  // Build the /send URL
  const sendUrl = new URL(`${APP_URL}/send`);
  sendUrl.searchParams.set("ref", ref);
  if (args.context) {
    sendUrl.searchParams.set("context", args.context);
  }
  // Relay key goes in the fragment — never sent to server
  const fullUrl = `${sendUrl.toString()}#${relayKey}`;

  const contextLabel = args.context || "sensitive information";

  // First return: the user-facing message the agent should display
  const userMessage = [
    `I need your ${contextLabel}, but let's keep it secure.`,
    `Open this link — your data is encrypted in your browser and can only be read once, then it's permanently destroyed:`,
    ``,
    fullUrl,
  ].join("\n");

  // Poll the relay for up to 60 seconds
  const voltaUrl = await pollRelay(ref, relayKey);

  if (!voltaUrl) {
    // Timeout — return fallback instructions
    return {
      content: [
        userMessage,
        ``,
        `---`,
        ``,
        `I haven't received the secret yet. If you've already submitted it, paste the Volta link here and I'll read it directly.`,
        ``,
        `If you haven't yet, open this link to share it securely:`,
        fullUrl,
      ].join("\n"),
    };
  }

  // Success — read and burn the Volta note
  const result = await readNoteTool.execute({ url: voltaUrl });

  if ("error" in result) {
    return { error: `Relay received a response, but reading the note failed: ${result.error}` };
  }

  return {
    content: [
      `Secret received via Volta Notes (now permanently destroyed):`,
      ``,
      result.content,
      ``,
      `This note has been permanently deleted from Volta. No copy exists anywhere.`,
      `Important: Do not display this secret in the conversation. Use it programmatically only.`,
    ].join("\n"),
  };
}
