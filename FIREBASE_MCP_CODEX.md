# Firebase MCP for Codex

Codex is configured with a global Firebase MCP server:

```toml
[mcp_servers.firebase]
command = "npx"
args = ["-y", "firebase-tools@latest", "mcp"]
```

Firebase CLI auth is already working for `jmjrice94@gmail.com`.

## Verify

```powershell
codex mcp list
codex mcp get firebase
npx -y firebase-tools@latest login:list
npx -y firebase-tools@latest projects:list
```

## Use In Codex

Start a new Codex thread or restart Codex so the new MCP server is loaded into the tool list. Then ask Codex to use Firebase. Useful first requests:

```text
Use the Firebase MCP server to list my Firebase projects.
Use Firebase MCP to set the active project to ourstuff-firebase.
Use Firebase MCP to inspect Firestore rules for the current project.
```

If a workspace contains `firebase.json`, Firebase MCP will detect the project context. If it does not, ask Codex to set the project directory or active Firebase project through the Firebase MCP environment tools.

## Config Commands

Add again if needed:

```powershell
codex mcp add firebase -- npx -y firebase-tools@latest mcp
```

Remove if needed:

```powershell
codex mcp remove firebase
```
