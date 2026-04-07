# @voltanotes/mcp

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

### Install

```bash
npm install -g @voltanotes/mcp
```

### Claude Code

Find where the package was installed:

```bash
npm root -g
```

Then add to your MCP config (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "volta": {
      "command": "node",
      "args": ["<npm-global-root>/@voltanotes/mcp/dist/index.js"]
    }
  }
}
```

Replace `<npm-global-root>` with the output of `npm root -g` (e.g. `/usr/local/lib/node_modules` or `~/.npm-global/lib/node_modules`).

If `node` isn't found, use the full path (run `which node` to find it).

### Claude Desktop

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

> **Note:** The `npx` method works well for Claude Desktop, which has full PATH access. For Claude Code, use the global install method above — see [Troubleshooting](#troubleshooting) for details.

## Tools

### `create_volta_note`

Creates an encrypted note and returns a one-time URL.

| Parameter | Type   | Description                          |
|-----------|--------|--------------------------------------|
| `content` | string | Secret content to encrypt (max 2 KB) |

**Returns:** A `voltanotes.com` URL. The recipient opens it once, reads the content, and it's gone forever.

### `read_volta_note`

Reads and permanently destroys a Volta note.

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

### Server not connecting in Claude Code

Claude Code's shell often runs with a minimal `PATH` (e.g. `/usr/bin:/bin:/usr/sbin:/sbin`) that doesn't include the directory where `npx` is installed. The server silently fails to start — no error is shown.

**Fix — use the full path to npx and set the PATH environment variable:**

Find your npx location:

```bash
which npx
```

Then update your MCP config (`~/.claude/mcp.json`) to use the full path **and** provide the PATH so child processes (like `node`) can also be found:

```json
{
  "mcpServers": {
    "volta": {
      "command": "/usr/local/bin/npx",
      "args": ["-y", "@voltanotes/mcp"],
      "env": {
        "PATH": "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

Replace `/usr/local/bin` with the directory from `which npx`. The `env.PATH` is required because `npx` spawns `node` as a child process, which also needs to be discoverable.

Alternatively, if you installed the package globally (`npm install -g @voltanotes/mcp`), you can reference the binary directly:

```json
{
  "mcpServers": {
    "volta": {
      "command": "/usr/local/bin/volta-mcp",
      "env": {
        "PATH": "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

After updating the config, restart Claude Code to pick up the change.

### Server configured but still not connecting

Claude Code loads MCP configs from multiple levels — **global** (`~/.claude/mcp.json`) and **project-level** (`.claude/mcp.json` in the project directory or any parent directory). If you added Volta to your global config but have a project-level config, the server may not load for that project.

Check for project-level configs:

```bash
find ~/your-project-root -maxdepth 3 -path "*/.claude/mcp.json"
```

If a project-level config exists, add the Volta server entry there too.

### How do I know if the server started?

The server logs `Volta MCP server started` to stderr on successful startup. If you don't see this in your MCP server logs, the server isn't running.

## Requirements

- Node.js 18+ (uses built-in Web Crypto API)

## License

MIT — [Unprompted Labs](https://voltanotes.com)
