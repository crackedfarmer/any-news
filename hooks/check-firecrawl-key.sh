#!/bin/sh
# SessionStart hook: remind user to set up Firecrawl API key if missing.
# Outputs JSON so the message appears in the terminal via systemMessage.

if [ -z "$FIRECRAWL_API_KEY" ]; then
  printf '{"systemMessage": "⚠️  FIRECRAWL_API_KEY is not set. The earnings feature requires a Firecrawl API key. Run /setup-firecrawl for setup instructions. (The economic calendar works without it.)"}'
fi
