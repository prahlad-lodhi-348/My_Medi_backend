# GitHub MCP setup (github/github-mcp-server)

## 1) blackbox_mcp_settings.json
This repo includes `blackbox_mcp_settings.json` configured with the required server name:

- **server name**: `github.com/github/github-mcp-server`

- **type**: `http`
- **url**: `https://api.githubcopilot.com/mcp/`

## 2) Next step: connect the MCP server in your MCP host
The MCP host (VS Code / Blackbox host) must be running and must read `blackbox_mcp_settings.json` to start/connect the server.

## 3) Demonstrate capabilities
Once connected, run a test tool call such as:

- `get_me`

This should return the authenticated GitHub user profile.

