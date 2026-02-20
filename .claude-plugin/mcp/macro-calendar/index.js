#!/usr/bin/env node
// Macro calendar MCP server — zero external dependencies, Node.js built-ins only.
// Requires Node 18+ (for global fetch).

"use strict";
const { createInterface } = require("readline");

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchCalendarHTML() {
  const res = await fetch("https://tradingeconomics.com/calendar", {
    headers: REQUEST_HEADERS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// HTML parsing helpers
// ---------------------------------------------------------------------------

/** Strip all HTML tags from a snippet and collapse whitespace. */
function text(snippet) {
  return snippet.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || null;
}

/** Extract a single attribute value from a tag string (handles single or double quotes). */
function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}=["']([^"']*)["']`));
  return m ? m[1] : null;
}

/** Extract inner content of the first matching tag. */
function inner(html, selector) {
  const m = html.match(new RegExp(`${selector}[\\s\\S]*?<\\/(?:span|a|td)>`));
  return m ? m[0] : null;
}

// ---------------------------------------------------------------------------
// Calendar parser
// ---------------------------------------------------------------------------

/**
 * Parse Trading Economics calendar HTML into structured event objects.
 * @param {string} html
 * @param {string|null} targetDate  YYYY-MM-DD filter (null = all dates)
 * @returns {Array}
 */
function parseCalendarHTML(html, targetDate) {
  const entries = [];

  // Split specifically on calendar event rows (which always have data-url attribute).
  // Using data-url avoids fragmentation from nested <tr> inside country/flag tables.
  const chunks = html.split(/(?=<tr\s+data-url=")/);

  for (const chunk of chunks) {
    if (!chunk.includes("data-country=")) continue;

    // Use the full chunk — no </tr> slicing needed since we split on the next row
    const row = chunk;

    // ---- Row-level data attributes ----
    const country    = attr(row, "data-country");
    const symbol     = attr(row, "data-symbol");
    const eventAttr  = attr(row, "data-event");
    if (!country) continue;

    // ---- Date: CSS class on first <td> — may use single or double quotes ----
    const dateMatch = row.match(/class=["'][^"']*\s(\d{4}-\d{2}-\d{2})\s*["']/);
    if (!dateMatch) continue;
    const date = dateMatch[1];
    if (targetDate && date !== targetDate) continue;

    // ---- Time: inside <span class="event-N ..."> ----
    const timeSpanMatch = row.match(/<span[^>]+class=["']event-\d[^"']*["'][^>]*>([\s\S]*?)<\/span>/);
    const time = timeSpanMatch ? text(timeSpanMatch[1]) : null;

    // ---- Importance: calendar-date-1 = low, calendar-date-2 = medium, calendar-date-3 = high ----
    const importanceMatch = timeSpanMatch
      ? timeSpanMatch[0].match(/calendar-date-(\d)/)
      : null;
    const importanceMap = { "1": "low", "2": "medium", "3": "high" };
    const importance = importanceMatch ? (importanceMap[importanceMatch[1]] || "low") : "low";

    // ---- Country ISO ----
    const isoMatch = row.match(/class=["']calendar-iso["'][^>]*>([\s\S]*?)<\/td>/);
    const countryISO = isoMatch ? text(isoMatch[1]) : null;

    // ---- Event name ----
    const eventNameMatch = row.match(/class=["']calendar-event["'][^>]*>([\s\S]*?)<\/a>/);
    const eventName = eventNameMatch ? text(eventNameMatch[1]) : (eventAttr || null);

    // ---- Reference period (e.g. "FEB", "Q4 2025") ----
    const refMatch = row.match(/class=["']calendar-reference["'][^>]*>([\s\S]*?)<\/span>/);
    const reference = refMatch ? text(refMatch[1]) : null;

    // ---- Data values — may use single or double quotes on id attribute ----
    const actualMatch    = row.match(/<span id=["']actual["'][^>]*>([\s\S]*?)<\/span>/);
    const prevMatch      = row.match(/<span id=["']previous["'][^>]*>([\s\S]*?)<\/span>/);
    const consMatch      = row.match(/<[a-z]+ id=["']consensus["'][^>]*>([\s\S]*?)<\/[a-z]+>/);
    const forecastMatch  = row.match(/<[a-z]+ id=["']forecast["'][^>]*>([\s\S]*?)<\/[a-z]+>/);

    const val = (m) => (m ? text(m[1]) : null);

    entries.push({
      date,
      time,
      country: country.replace(/\b\w/g, (c) => c.toUpperCase()),
      country_iso: countryISO,
      event: eventName,
      reference,
      actual:    val(actualMatch),
      previous:  val(prevMatch),
      consensus: val(consMatch),
      forecast:  val(forecastMatch),
      symbol,
      importance,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC server
// ---------------------------------------------------------------------------

const TOOL = {
  name: "get_macro_calendar",
  description:
    "Fetch macroeconomic calendar events from Trading Economics. " +
    "Returns structured data including event names, countries, times, " +
    "and actual/previous/consensus/forecast values. " +
    "Note: the page only contains events within a few days of today — " +
    "requests for dates far in the future or past may return no results.",
  inputSchema: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description:
          "Date in YYYY-MM-DD format to filter events (e.g. 2026-02-20). " +
          "Omit to return all events available on the page.",
      },
    },
    required: [],
  },
};

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
function sendResult(id, result) { send({ jsonrpc: "2.0", id, result }); }
function sendError(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

async function handleMessage(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return;

  switch (method) {
    case "initialize":
      sendResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "macro-calendar", version: "1.0.0" },
      });
      break;

    case "tools/list":
      sendResult(id, { tools: [TOOL] });
      break;

    case "tools/call": {
      const { name, arguments: args } = params || {};
      if (name !== "get_macro_calendar") {
        sendError(id, -32601, `Unknown tool: ${name}`);
        break;
      }

      const date = (args || {}).date || null;
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        sendResult(id, {
          content: [{ type: "text", text: `Error: date must be in YYYY-MM-DD format, got: "${date}"` }],
          isError: true,
        });
        break;
      }

      try {
        const html = await fetchCalendarHTML();
        const entries = parseCalendarHTML(html, date);

        sendResult(id, {
          content: [{
            type: "text",
            text: JSON.stringify(
              {
                date: date || "all",
                count: entries.length,
                entries,
                ...(entries.length === 0 && date
                  ? { note: `No events found for ${date}. The page only shows events close to today's date.` }
                  : {}),
              },
              null,
              2
            ),
          }],
        });
      } catch (err) {
        sendResult(id, {
          content: [{
            type: "text",
            text: `Failed to fetch Trading Economics calendar: ${err.message}\n\nYou can try again by calling get_macro_calendar.`,
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
  try { msg = JSON.parse(trimmed); }
  catch (_) {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  await handleMessage(msg);
});
