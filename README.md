# @voltanotes/mcp

[![npm version](https://img.shields.io/npm/v/@voltanotes/mcp)](https://www.npmjs.com/package/@voltanotes/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

MCP server for [Volta Notes](https://voltanotes.com) — create and read **burn-after-read** encrypted notes from any AI agent.

Notes are **end-to-end encrypted** using AES-256-GCM. The decryption key lives only in the URL fragment — it is never sent to any server. Notes are stored on the [Internet Computer](https://internetcomputer.org) and permanently destroyed after a single read.

## Why

AI agents regularly need sensitive information at runtime — API keys, passwords, credentials. Today, users paste these into chat where they're stored permanently in conversation history.

With this MCP server, the pattern becomes:

1. User creates a note at [voltanotes.com](https://app.voltanotes.com) and sends the one-time URL
2. Agent calls `read_volta_note` — secret returned, note permanently destroyed
3. Nothing sensitive ever appears in chat history

Or in reverse — an agent can use `create_volta_note` to send credentials to a user via a self-destructing link.

## Quick Start

### Claude Code (CLI & Desktop App)

**Step 1 — Install globally:**

```bash
npm install -g @voltanotes/mcp
```

**Step 2 — Register the server:**

```bash
claude mcp add -s user volta -- node $(npm root -g)/@voltanotes/mcp/dist/index.js
```

That's it. Restart Claude Code and the `create_volta_note` and `read_volta_note` tools will be available.

> **Why `claude mcp add` instead of editing config files?** Claude Code reads MCP servers from its own registry, not from `~/.claude/mcp.json`. Using the CLI ensures the server is registered correctly. The `-s user` flag makes it available across all projects.

> **`node` not found?** Use the full path: replace `node` with the output of `which node` (e.g. `/usr/local/bin/node`).

### Claude Desktop (Standalone)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "volta": {
      "command": "npx",
      "args": ["-y", "@voltanotes/mcp"]
    }
  }
}
```

### Other MCP-compatible clients

The `npx` config above works with any client that supports the standard `command`/`args` MCP format — including **Cursor**, **Windsurf**, **Cline**, **Continue.dev**, and others. Check your client's MCP documentation for where to add server config.

### Windows (Claude Code CLI)

The `$(npm root -g)` syntax doesn't work in PowerShell or CMD. Use this instead:

```bash
claude mcp add -s user volta -- node "%APPDATA%\npm\node_modules\@voltanotes\mcp\dist\index.js"
```

Or use the Claude Desktop / npx method above, which works cross-platform.

## Workflows

### Agent receiving a secret from the user

Use this when you need a password, API key, or credentials from the user:

1. Ask the user to go to [app.voltanotes.com](https://app.voltanotes.com), paste their secret, and copy the one-time URL
2. User sends you the URL
3. Call `read_volta_note` with the URL — secret is returned and note is permanently destroyed

### Agent sending a secret to the user

Use this when you've generated something sensitive (a password, a key, credentials) that the user needs to see:

1. Call `create_volta_note` with the content
2. Share the returned URL with the user
3. User opens it once — content displayed, note destroyed

> **Do not** call `create_volta_note` to ask the user to reply with a secret. Notes are read-only after creation — the user can't put content into a note you created. Use the first workflow above instead.

## Tools

### `create_volta_note`

Creates an encrypted note and returns a one-time URL. Use this to **send** sensitive information to a user.

> **Not for receiving secrets.** To receive a secret from the user, ask them to create the note and send you the URL — then call `read_volta_note`.

| Parameter | Type   | Description                          |
|-----------|--------|--------------------------------------|
| `content` | string | Secret content to encrypt (max 2 KB) |

**Returns:** A `voltanotes.com` URL. The recipient opens it once, reads the content, and it's gone forever.

### `read_volta_note`

Reads and permanently destroys a Volta note. Use this when a user sends you a `voltanotes.com` URL containing sensitive information.

| Parameter | Type   | Description                            |
|-----------|--------|----------------------------------------|
| `url`     | string | Full Volta URL including `#` fragment  |

**Returns:** The decrypted note content. The note is permanently deleted from the canister — a second read will fail.

## Agent Prompt Snippet

Add this to any agent's system prompt to enable secure credential handoff:

```
When you need a secret from the user (API key, password, credentials):
1. Ask them to go to voltanotes.com and paste the secret into the note field
2. They'll get a one-time URL — ask them to send it to you
3. Use the read_volta_note tool with that URL to retrieve the secret
The secret is permanently destroyed after you read it — it never appears in chat history.
```

## Security Model

- **AES-256-GCM** encryption happens locally before anything is sent to the canister
- The encryption key exists only in the URL fragment (`#...`) — browsers and servers never transmit fragments
- The ICP canister stores only ciphertext — even if compromised, all data is unreadable
- Notes are destroyed on first read. Unread notes expire after 7 days.
- No accounts, no login, no tracking

## How It Works

```
Agent calls create_volta_note("secret-api-key-123")
  → Local: generate AES-256 key + encrypt
  → ICP canister: store ciphertext → returns noteId
  → Return URL: voltanotes.com/r/{noteId}#{key}

User opens URL → read gate → clicks "Read note"
  → Browser: fetch ciphertext from canister (canister deletes it)
  → Browser: decrypt using key from # fragment
  → Display plaintext — note is gone forever
```

## Troubleshooting

### Check if the server is connected

```bash
claude mcp list
```

You should see `volta: ... ✓ Connected`. If not, see below.

### Server not showing up

1. **Did you use `claude mcp add`?** Editing `~/.claude/mcp.json` manually won't work — Claude Code reads servers from its own registry. Always use `claude mcp add` to register servers.

2. **Is `node` on your PATH?** Claude Code's shell has a minimal PATH. If `node` isn't found, use the full path:
   ```bash
   claude mcp add -s user volta -- $(which node) $(npm root -g)/@voltanotes/mcp/dist/index.js
   ```

3. **Restart required.** After adding or changing an MCP server, fully restart Claude Code (quit and reopen).

### How do I know if the server started?

The server logs `Volta MCP server started` to stderr on successful startup. Run `claude mcp list` to check connection status.

## Requirements

- Node.js 18+ (uses built-in Web Crypto API)

## License

MIT — [Unprompted Labs](https://voltanotes.com)
