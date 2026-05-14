# MCP GitHub Server - Demo Steps

## 1) Verify the config file exists
- `d:/MY_medi/my_medi_django/blackbox_mcp_settings.json`

## 2) Ensure your MCP host loads this config
Depending on your host:
- **Blackbox**: ensure it points to this workspace config (or that it reads `blackbox_mcp_settings.json`).
- **VS Code**: ensure MCP server config is loaded and server name matches.

## 3) Remote server name (required)
Server name in the config must be exactly:
- `github.com/github/github-mcp-server`

## 4) Demonstrate capabilities (example tool call)
After the server is connected, run one read-only tool like:
- `get_me`

Expected result: your authenticated GitHub user profile JSON.

## 5) If the demo doesn’t work
Common causes:
- MCP host isn’t actually connected/running.
- Host requires OAuth/PAT input and your config doesn’t provide it.
- Network/proxy blocks calls to `https://api.githubcopilot.com/mcp/`.

