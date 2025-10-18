# Discord Integration Quick Start

**Quick reference for integrating Chronos pipeline with Discord bot.**

Full instructions: See `DISCORD_CHRONOS_INTEGRATION_INSTRUCTIONS.md`

---

## 📦 What to Give to Another Claude Code

Share these files/information with the Claude Code instance working on Discord:

1. **Main Instructions:** `DISCORD_CHRONOS_INTEGRATION_INSTRUCTIONS.md`
2. **Reference Implementation:** `/chronos/telegram_main.py` and `/src/plugin.ts` (lines 397-227)
3. **Project Context:** This is an ElizaOS project with existing Chronos pipeline

---

## ⚠️ Critical Warnings to Emphasize

```
❌ DO NOT skip Neo4j
❌ DO NOT create a new pipeline implementation
❌ DO NOT read results from files
❌ DO NOT forget to clear Neo4j before each image
```

---

## 🎯 What Needs to Be Done

### **Create 1 File:**
- `/chronos/discord_main.py` (copy from `telegram_main.py`, change markers to DISCORD_*)

### **Modify 1 File:**
- `/src/plugin.ts` - Add `DISCORD_MESSAGE_RECEIVED` event handler

### **Key Changes:**
```
telegram → discord
TELEGRAM_RESULTS_START → DISCORD_RESULTS_START
TELEGRAM_RESULTS_END → DISCORD_RESULTS_END
4000 char limit → 1900 char limit
```

---

## 🚀 Architecture

```
Discord Image Upload
    ↓
plugin.ts (DISCORD_MESSAGE_RECEIVED)
    ↓
Download to temp_images/
    ↓
python3 chronos/discord_main.py <image> <user_id>
    ↓
    1. Clear Neo4j ← CRITICAL!
    2. OCR (Gemini)
    3. Knowledge Graph (OpenAI → Neo4j)
    4. Pattern Discovery
    5. Hypothesis Verification
    6. Output to stdout (DISCORD_RESULTS_START/END)
    ↓
Parse stdout
    ↓
Send to Discord (with message splitting)
```

---

## ✅ Success Criteria

Integration is successful when:
- User uploads image to Discord
- Bot responds: "⏳ Processing..."
- ~1-2 minutes later
- Bot sends complete hypothesis verification results
- Each new image gets unique hypotheses (not mixed with old ones)

---

## 📚 Context About Our Journey

We initially tried to:
1. Skip Neo4j ❌ - Learned it's essential for pattern discovery
2. Create simplified pipeline ❌ - Had parameter compatibility issues
3. Read results from files ❌ - Caused race conditions with multiple users

**Final working solution:**
- Use existing pipeline via subprocess
- Clear Neo4j before each processing
- Parse results from stdout (not files)
- All credentials from single `.env` file

---

## 🔗 Reference Files

**Working Implementation (Telegram):**
- `/chronos/telegram_main.py` - Python wrapper
- `/src/plugin.ts` lines 397-227 - Event handler

**Core Pipeline (DO NOT MODIFY):**
- `/chronos/app/pipeline.py` - OCR + Knowledge Graph
- `/chronos/app/kg_pattern_discovery.py` - Pattern discovery
- `/chronos/app/hypothesis_verifier.py` - Hypothesis verification
- `/chronos/app/neo4j_cleanup.py` - Database cleanup

**Configuration:**
- `/.env` - Single source of all credentials

---

## 💬 Prompt for Another Claude Code

```
I need you to integrate the existing Chronos pipeline with a Discord bot in this ElizaOS project.

IMPORTANT: There's a working Telegram integration you should reference.
DO NOT create a new pipeline implementation - use the existing one via subprocess.
DO NOT skip Neo4j - it's essential for pattern discovery.

Please read these files:
1. DISCORD_CHRONOS_INTEGRATION_INSTRUCTIONS.md - Complete instructions
2. chronos/telegram_main.py - Working reference implementation
3. src/plugin.ts (lines 397-227) - Telegram event handler

Your task:
1. Create chronos/discord_main.py (adapt from telegram_main.py)
2. Add DISCORD_MESSAGE_RECEIVED event handler in src/plugin.ts

Follow the instructions exactly. The architecture must match the Telegram implementation.
```

---

## 📊 Expected Timeline

- **File creation:** 5 minutes
- **Testing setup:** 2 minutes
- **First test:** 1-2 minutes (pipeline processing)
- **Debugging:** 5-10 minutes (if any issues)

**Total:** ~20-30 minutes for full implementation

---

**For detailed code examples and troubleshooting, see `DISCORD_CHRONOS_INTEGRATION_INSTRUCTIONS.md`**
