# any-news

Financial news plugin for [Claude Code](https://claude.ai/claude-code) — economic calendar events and earnings reports, fetched on demand.

## Features

- **Economic calendar** — today's and upcoming macro events from Trading Economics (CPI, GDP, NFP, rate decisions, etc.) with impact ratings and market context
- **Earnings calendar** — company earnings announcements from Yahoo Finance with EPS estimates, reported results, and surprise calculations
- **Smart tool validation** — a pre-flight hook prevents unnecessary API calls when questions can be answered from general knowledge
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
