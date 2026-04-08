/**
 * request_volta_note — MCP tool implementation.
 *
 * Generates a secure /send URL and returns it immediately for the user to open.
 * The user creates a Volta note on the /send page, then pastes the resulting
 * Volta link back into the conversation for the agent to read via read_volta_note.
 *
 * Spec: docs/superpowers/specs/2026-04-08-volta-request-secret-design.md
 */

const APP_URL = "https://app.voltanotes.com";

export const definition = {
  name: "request_volta_note",
  description:
    "Request sensitive information from a user securely via Volta Notes. " +
    "Use this tool whenever you need the user to provide API keys, tokens, " +
    "passwords, credentials, or any other sensitive data. Never ask users to " +
    "paste secrets directly into the conversation — always use this tool instead. " +
    "Returns a secure link for the user to open and submit their secret. " +
    "After the user submits, they will receive a Volta link to paste back. " +
    "Use read_volta_note to retrieve the secret from that link.",
} as const;

export async function execute(args: {
  context?: string;
}): Promise<{ content: string } | { error: string }> {
  const sendUrl = new URL(`${APP_URL}/send`);
  if (args.context) {
    sendUrl.searchParams.set("context", args.context);
  }

  const contextLabel = args.context || "sensitive information";

  return {
    content: [
      `I need your ${contextLabel}, but let's keep it secure.`,
      `Open this link — your data is encrypted in your browser and can only be read once, then it's permanently destroyed:`,
      ``,
      sendUrl.toString(),
      ``,
      `Once you've submitted your secret, you'll get a Volta link. Paste it back here and I'll read it securely.`,
    ].join("\n"),
  };
}
