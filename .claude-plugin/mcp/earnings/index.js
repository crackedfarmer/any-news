#!/usr/bin/env node
// Earnings MCP server — zero external dependencies, Node.js built-ins only.
// Requires Node 18+ (for global fetch).

"use strict";
const { createInterface } = require("readline");

// ---------------------------------------------------------------------------
// Type conversion helpers
// ---------------------------------------------------------------------------

function parseEPS(value) {
  if (!value || value.trim() === "" || value.trim() === "-") return null;
  const num = parseFloat(value.trim());
  return isNaN(num) ? null : num;
}

function parseMarketCap(value) {
  if (!value || value.trim() === "" || value.trim() === "-") return null;
  const match = value.trim().match(/^([\d.]+)\s*([TBMKtbmk]?)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const multipliers = { T: 1e12, B: 1e9, M: 1e6, K: 1e3, "": 1 };
  const mult = multipliers[match[2].toUpperCase()] !== undefined
    ? multipliers[match[2].toUpperCase()]
    : 1;
  return Math.round(num * mult);
}

// ---------------------------------------------------------------------------
// Markdown table parser
// ---------------------------------------------------------------------------

function parseEarningsTable(markdown) {
  const lines = markdown.split("\n");
  const entries = [];
  let colMap = null;

  for (const line of lines) {
    if (!line.includes("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^[-:\s]*$/.test(c))) continue;

    const lower = cells.map((c) => c.toLowerCase());
    if (lower.some((c) => c === "symbol")) {
      colMap = {
        symbol:      lower.findIndex((c) => c === "symbol"),
        company:     lower.findIndex((c) => c === "company"),
        event_name:  lower.findIndex((c) => c === "event name"),
        call_time:   lower.findIndex((c) => c.includes("earnings call time") || c === "call time"),
        eps_estimate:lower.findIndex((c) => c.includes("eps estimate")),
        reported_eps:lower.findIndex((c) => c.includes("reported eps")),
        market_cap:  lower.findIndex((c) => c.includes("market cap")),
      };
      continue;
    }

    if (!colMap) continue;
    const symbol = cells[colMap.symbol];
    if (!symbol || symbol === "") continue;

    entries.push({
      stock_symbol:      symbol,
      company:           cells[colMap.company]      || null,
      event_name:        cells[colMap.event_name]   || null,
      earnings_call_time:cells[colMap.call_time]    || null,
      eps_estimate:      parseEPS(cells[colMap.eps_estimate]),
      reported_eps:      parseEPS(cells[colMap.reported_eps]),
      market_cap:        parseMarketCap(cells[colMap.market_cap]),
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Firecrawl scraping
// ---------------------------------------------------------------------------

async function scrapeWithFirecrawl(url) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY environment variable is not set");

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 3000,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Unknown Firecrawl error");
  return data.data.markdown;
}

// ---------------------------------------------------------------------------
// Yahoo Finance URL helpers
// ---------------------------------------------------------------------------

function getWeekBounds(dateStr) {
  const date = new Date(dateStr + "T00:00:00Z");
  const dow = date.getUTCDay();
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() - dow);
  const saturday = new Date(sunday);
  saturday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    from: sunday.toISOString().split("T")[0],
    to:   saturday.toISOString().split("T")[0],
  };
}

function buildYahooUrl(date, offset, size) {
  const { from, to } = getWeekBounds(date);
  return `https://finance.yahoo.com/calendar/earnings?from=${from}&to=${to}&day=${date}&offset=${offset}&size=${size}`;
}

async function fetchAllEarnings(date) {
  const all = [];
  let offset = 0;
  const PAGE_SIZE = 100;

  while (true) {
    const url = buildYahooUrl(date, offset, PAGE_SIZE);
    const markdown = await scrapeWithFirecrawl(url);
    const entries = parseEarningsTable(markdown);
    all.push(...entries);
    if (entries.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC server — no SDK, just readline + stdout
// ---------------------------------------------------------------------------

const TOOL = {
  name: "get_earnings",
  description:
    "Fetch earnings announcements for a specific date from Yahoo Finance. " +
    "Returns structured data including EPS estimates, reported EPS, market caps, " +
    "and earnings call times. Handles pagination automatically.",
  inputSchema: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format (e.g. 2026-02-19)",
      },
    },
    required: ["date"],
  },
};

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMessage(msg) {
  const { id, method, params } = msg;

  // Notifications have no id — no response required
  if (id === undefined || id === null) return;

  switch (method) {
    case "initialize":
      sendResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "earnings", version: "1.0.0" },
      });
      break;

    case "tools/list":
      sendResult(id, { tools: [TOOL] });
      break;

    case "tools/call": {
      const { name, arguments: args } = params || {};
      if (name !== "get_earnings") {
        sendError(id, -32601, `Unknown tool: ${name}`);
        break;
      }

      const date = (args || {}).date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        sendResult(id, {
          content: [{ type: "text", text: `Error: date must be in YYYY-MM-DD format, got: "${date}"` }],
          isError: true,
        });
        break;
      }

      try {
        const entries = await fetchAllEarnings(date);
        sendResult(id, {
          content: [{
            type: "text",
            text: JSON.stringify({ date, count: entries.length, entries }, null, 2),
          }],
        });
      } catch (err) {
        sendResult(id, {
          content: [{
            type: "text",
            text: `Firecrawl failed with error: ${err.message}\n\nYou can try again by calling get_earnings with the same date.`,
          }],
          isError: true,
        });
      }
      break;
    }

    default:
      sendError(id, -32601, `Method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (_) {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  await handleMessage(msg);
});
