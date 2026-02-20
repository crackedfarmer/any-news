#!/bin/sh
# SessionStart hook: remind user to set up Firecrawl API key if missing.
# stdout is injected as context for Claude at session start.

if [ -z "$FIRECRAWL_API_KEY" ]; then
  echo "The FIRECRAWL_API_KEY environment variable is not set. The earnings feature requires a Firecrawl API key. Suggest the user run /setup-firecrawl for setup instructions. The economic calendar works without it."
fi
