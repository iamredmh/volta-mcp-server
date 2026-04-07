#!/usr/bin/env node

/**
 * @voltanotes/mcp — MCP server for Volta Notes.
 *
 * Two tools:
 *   - create_volta_note: encrypt and store a burn-after-read note
 *   - read_volta_note: decrypt and permanently destroy a note
 *
 * Runs over stdio transport for Claude Desktop / Claude Code / custom agents.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import * as createNoteTool from "./tools/create-note.js";
import * as readNoteTool from "./tools/read-note.js";

const server = new McpServer({
  name: "volta-notes",
  version: "1.0.0",
});

// --- create_volta_note ---------------------------------------------------

server.tool(
  createNoteTool.definition.name,
  createNoteTool.definition.description,
  {
    content: z
      .string()
      .max(2048)
      .describe(
        "The secret content to encrypt and store. Maximum 2,048 characters. " +
          "Will be AES-256-GCM encrypted before leaving this machine."
      ),
  },
  async ({ content }) => {
    const result = await createNoteTool.execute({ content });

    if ("error" in result) {
      return {
        content: [{ type: "text" as const, text: result.error }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Volta Note created.`,
            ``,
            `URL: ${result.url}`,
            ``,
            `This link can only be opened once — the note is permanently destroyed after reading.`,
            `The encryption key is in the URL fragment (#) and was never sent to any server.`,
          ].join("\n"),
        },
      ],
    };
  }
);

// --- read_volta_note ------------------------------------------------------

server.tool(
  readNoteTool.definition.name,
  readNoteTool.definition.description,
  {
    url: z
      .string()
      .describe(
        "The full Volta note URL including the #fragment key, " +
          "e.g. https://app.voltanotes.com/r/abc12345#encryptionKeyHere"
      ),
  },
  async ({ url }) => {
    const result = await readNoteTool.execute({ url });

    if ("error" in result) {
      return {
        content: [{ type: "text" as const, text: result.error }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Note contents (now permanently destroyed):`,
            ``,
            result.content,
            ``,
            `This note has been permanently deleted from Volta. No copy exists anywhere.`,
          ].join("\n"),
        },
      ],
    };
  }
);

// --- Start ----------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Volta MCP server started");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
