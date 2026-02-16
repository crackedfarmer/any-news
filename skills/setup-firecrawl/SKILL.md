---
name: setup-firecrawl
description: Set up the Firecrawl API key required by the any-news plugin
disable-model-invocation: true
---

# Firecrawl API Key Setup

The **any-news** plugin uses Firecrawl to scrape economic calendar data. Follow these steps to configure your API key.

## Steps

1. **Get an API key** from https://firecrawl.dev/app/api-keys
   - Create a free Firecrawl account if you don't have one
   - The free tier includes 500 credits — enough for extensive testing

2. **Add the key to your shell profile.** Run one of these:

   **zsh (default on macOS):**
   ```bash
   echo 'export FIRECRAWL_API_KEY="fc-YOUR_KEY_HERE"' >> ~/.zshrc
   source ~/.zshrc
   ```

   **bash:**
   ```bash
   echo 'export FIRECRAWL_API_KEY="fc-YOUR_KEY_HERE"' >> ~/.bashrc
   source ~/.bashrc
   ```

   Replace `fc-YOUR_KEY_HERE` with your actual API key.

3. **Restart Claude Code** so it picks up the new environment variable.

4. **Test** by asking: "What economic events are happening today?"

## Troubleshooting

- Run `echo $FIRECRAWL_API_KEY` to verify the key is set
- The key should start with `fc-`
- Use `claude --debug` to check for MCP server errors
- If using a self-hosted Firecrawl instance, also set `FIRECRAWL_API_URL`
