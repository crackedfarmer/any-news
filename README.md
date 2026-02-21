# any-news

Financial news plugin for [Claude Code](https://claude.ai/claude-code) — economic calendar events and earnings reports, fetched on demand.

## Features

- **Economic calendar** — today's and upcoming macro events from Trading Economics (CPI, GDP, NFP, rate decisions, etc.) with impact ratings and market context
- **Earnings calendar** — company earnings announcements from Yahoo Finance with EPS estimates, reported results, and surprise calculations
- **Data quality validation** — a post-tool hook verifies that scraped data contains real economic events, not placeholder or error text
- **API key check** — reminds you to set up Firecrawl on session start if the key is missing

## Requirements

- [Claude Code](https://claude.ai/claude-code)
- Node.js 18+
- A [Firecrawl](https://firecrawl.dev) API key (free tier, required for earnings only)

## Installation

```
/plugin marketplace add crackedfarmer/any-news
/plugin install any-news@any-news-marketplace
```

Restart Claude Code after installing.

### Set up the Firecrawl API key (for earnings)

The earnings feature scrapes Yahoo Finance via Firecrawl. Run `/setup-firecrawl` inside Claude Code for step-by-step instructions, or add the key manually:

```bash
echo 'export FIRECRAWL_API_KEY="your-key-here"' >> ~/.zshrc && source ~/.zshrc
```

Get a free key at [firecrawl.dev/app/api-keys](https://firecrawl.dev/app/api-keys) (500 free credits).

The economic calendar works without any API key.

## Usage

Just ask naturally — Claude will use the right agent automatically.

**Economic calendar:**
> "What economic events are happening today?"
> "Show me tomorrow's macro calendar"
> "Any high-impact events this week?"

**Earnings:**
> "Which companies are reporting earnings today?"
> "Show me earnings for February 20th"
> "What are the EPS results for this week?"

## Hooks

This plugin uses [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) to enhance the experience. Below is what we ship, what we tried, and what we learned.

### What's included

| Hook | Type | Purpose |
|------|------|---------|
| `SessionStart` | command | Checks if `FIRECRAWL_API_KEY` is set and reminds the user if not |
| `PostToolUse` (macro calendar) | prompt | Validates that scraped data contains real economic events, not placeholder/error text |

### The PreToolUse experiment (and why we dropped it)

We originally built a **PreToolUse prompt hook** for the macro calendar tool. The idea: use an LLM to decide whether the user's question actually needs live data, or if it can be answered from general knowledge — preventing unnecessary API calls.

It didn't work. Here's the timeline:

1. **Agent-type hooks are broken for plugins.** Our first attempt used `"type": "agent"`, which fails with `"Messages are required for agent hooks. This is a bug."` This is a known Claude Code issue — plugin-provided hooks cannot use the agent type.

2. **Switched to prompt type, hit JSON parsing errors.** The LLM was asked to respond with `{"ok": true}` or `{"ok": false, "reason": "..."}` but would wrap its response in markdown code fences or add explanatory text, breaking the hook system's JSON parser. We tried multiple prompt rewrites ("You are a JSON-only validation gate", "No markdown, no code fences, no explanation") with mixed results.

3. **Plugin hooks sometimes don't load at all.** Debug logs revealed a timing issue: Claude Code registers hooks *before* the plugin system fully initializes. At startup, the log shows `"Found 0 plugins (0 enabled, 0 disabled)"` and `"Registered 0 hooks from 0 plugins"`, even though 5 plugins load moments later. This means plugin-provided PreToolUse hooks may silently fail to register.

4. **Command-type PreToolUse hooks fire silently.** Unlike `SessionStart` and `UserPromptSubmit` hooks, which show success/failure messages in the conversation, command-type PreToolUse hooks produce no visible output. This makes debugging extremely difficult — you can't tell if a hook ran, skipped, or errored without digging through `~/.claude/debug/latest`.

### Why PostToolUse works better

We switched to a **PostToolUse prompt hook** that validates the data *after* it comes back from the API. This approach has several advantages:

- **No timing issues** — by the time PostToolUse fires, the plugin and tool are already initialized.
- **Access to real data** — the hook receives the full `tool_response`, so it can validate actual content rather than guessing whether an API call is needed.
- **Practical validation** — our hook checks the first and last entries in the response for placeholder strings (`"Please subscribe"`, `"API key required"`, all-null fields), catching cases where scraping technically succeeds but returns garbage.

The tradeoff: PostToolUse can't *prevent* an API call, only validate its result. For our use case (free-tier scraping that occasionally returns error pages), this is the right tradeoff.

### Lessons learned

**What works:**
- `SessionStart` command hooks — reliable, visible confirmation in chat
- `PostToolUse` prompt hooks — fire correctly, receive full tool context
- `UserPromptSubmit` hooks — reliable with visible confirmation

**What doesn't (or is unreliable):**
- `"type": "agent"` hooks from plugins — broken, use `"type": "prompt"` instead
- `PreToolUse` hooks from plugins — may not load due to startup timing
- Command-type `PreToolUse` hooks — fire silently, no way to confirm execution

**General gotchas:**
- Hooks are **snapshotted at startup** — changes to `hooks.json` require restarting Claude Code
- Plugin hooks live in two places: the source repo (`hooks/hooks.json`) and the plugin cache (`~/.claude/plugins/cache/...`). Both must be in sync.
- Prompt hooks that expect JSON responses need aggressive prompt engineering — LLMs love adding explanations around JSON
- `PostToolUse` hook execution is **invisible in debug logs** even when successful, unlike `SessionStart` hooks which log fully
- There is no `updatedMCPToolOutput` field for PostToolUse — you can block or pass through, but not transform the response
