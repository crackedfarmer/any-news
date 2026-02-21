#!/bin/bash
# Test script to verify PreToolUse hook fires
LOG_FILE="${CLAUDE_PLUGIN_ROOT}/hooks/pretooluse.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] PreToolUse hook fired for macro-calendar tool" >> "$LOG_FILE"
