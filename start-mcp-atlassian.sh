#!/bin/bash
# Starts the Python mcp-atlassian MCP server (supports Jira/Confluence Data Center).
# NOTE: Claude Code uses settings.json with --env-file .env directly.
# This script is a manual fallback launcher only.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

exec uvx mcp-atlassian
