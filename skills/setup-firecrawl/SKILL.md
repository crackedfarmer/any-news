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

2. **Tell the user to get an API key** from https://firecrawl.dev/app/api-keys
   - Create a free account if needed (the free tier includes 500 credits)
   - The key starts with `fc-`

3. **IMPORTANT: Do NOT ask the user to paste the key into chat.** Instead, show them this exact command to run in a separate terminal window:

   ```bash
   echo 'export FIRECRAWL_API_KEY="YOUR_FIRECRAWL_KEY_HERE"' >> ~/.zshrc && source ~/.zshrc
   ```

   Tell them: "**Do not paste your API key into this chat** — it would be logged in conversation history. Instead, run this command in a separate terminal window, replacing YOUR_FIRECRAWL_KEY_HERE with your actual key."

   If they use bash instead of zsh, show `~/.bashrc` instead.

4. **After they've done that**, tell them to restart Claude Code so it picks up the new environment variable. Then they can test by asking: "What economic events are happening today?"

## Troubleshooting

If the user says it's not working after setup:
- Run `echo $FIRECRAWL_API_KEY` to verify the key is set in the current session
- The key should start with `fc-`
- Suggest running `source ~/.zshrc` if they haven't restarted
- Suggest `claude --debug` to check for MCP server errors
