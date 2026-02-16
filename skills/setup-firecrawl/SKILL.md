---
name: setup-firecrawl
description: Set up the Firecrawl API key required by the any-news plugin
disable-model-invocation: true
---

# Firecrawl API Key Setup

The **any-news** plugin uses Firecrawl to scrape economic calendar data. Help the user set up their API key.

## What to do

1. **Check if the key is already set.** Run: `echo $FIRECRAWL_API_KEY`
   - If it's set and starts with `fc-`, tell the user they're good to go and suggest: "Try asking: What economic events are happening today?"
   - If it's not set, continue to step 2.

2. **Tell the user to get an API key:**
   - Go to https://firecrawl.dev/app/api-keys
   - Create a free account if needed (the free tier includes 500 credits)
   - Copy the API key (it starts with `fc-`)

3. **Ask the user to paste their key.** Once they provide it, add it to their shell profile by running:

   ```bash
   echo 'export FIRECRAWL_API_KEY="THE_KEY_THEY_GAVE_YOU"' >> ~/.zshrc
   ```

   If they use bash instead of zsh, use `~/.bashrc` instead.

4. **Tell them to restart Claude Code** so it picks up the new environment variable. Then they can test by asking: "What economic events are happening today?"

## Troubleshooting

If the user says it's not working after setup:
- Run `echo $FIRECRAWL_API_KEY` to verify the key is set in the current session
- The key should start with `fc-`
- Suggest running `source ~/.zshrc` if they haven't restarted
- Suggest `claude --debug` to check for MCP server errors
