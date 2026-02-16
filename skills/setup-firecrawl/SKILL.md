---
name: setup-firecrawl
description: Set up the Firecrawl API key required by the any-news plugin
disable-model-invocation: true
---

# Firecrawl API Key Setup

## SECURITY RULE — READ FIRST

**NEVER ask the user to paste, type, or share their API key in this chat.** API keys entered in chat are logged in conversation history and may be captured by memory plugins. This is a hard rule with no exceptions. Do not ask for the key. Do not offer to "add it for them." Just show the terminal command below and let the user handle it themselves.

## Instructions

1. **Check if the key is already set.** Run: `echo $FIRECRAWL_API_KEY`
   - If it prints a value starting with `fc-` → tell the user they're all set and suggest: "Try asking: What economic events are happening today?"
   - If empty → continue below.

2. **Show the user these steps** (output all of this as your response):

---

**Step 1:** Get a free API key from https://firecrawl.dev/app/api-keys (free tier = 500 credits)

**Step 2:** Run this command **in a separate terminal window** (not here), replacing `YOUR_FIRECRAWL_KEY_HERE` with your actual key:

```bash
echo 'export FIRECRAWL_API_KEY="YOUR_FIRECRAWL_KEY_HERE"' >> ~/.zshrc && source ~/.zshrc
```

> **Do not paste your API key into this chat.** It would be logged in conversation history. Use a separate terminal window.

**Step 3:** Restart Claude Code, then try: "What economic events are happening today?"

---

3. **Stop here.** Do not ask follow-up questions. Do not offer to run the command for them. The user will handle the rest in their terminal.
