# Discord Integration Implementation Checklist

Use this checklist to track progress during Discord bot integration.

---

## 📋 Pre-Implementation

- [ ] Read `DISCORD_CHRONOS_INTEGRATION_INSTRUCTIONS.md` completely
- [ ] Review reference files:
  - [ ] `/chronos/telegram_main.py`
  - [ ] `/src/plugin.ts` (lines 397-227)
- [ ] Verify Neo4j is running: `neo4j status`
- [ ] Verify Python dependencies installed: `pip list | grep -E "(openai|google|futurehouse|neo4j)"`

---

## 🔧 Implementation Steps

### **Step 1: Create discord_main.py**

- [ ] Copy `/chronos/telegram_main.py` to `/chronos/discord_main.py`
- [ ] Change function name: `process_telegram_image` → `process_discord_image`
- [ ] Change element ID: `f"telegram_{user_id}_{timestamp}"` → `f"discord_{user_id}_{timestamp}"`
- [ ] Change print banner: "TELEGRAM IMAGE PROCESSING" → "DISCORD IMAGE PROCESSING"
- [ ] Change output markers:
  - [ ] `TELEGRAM_RESULTS_START` → `DISCORD_RESULTS_START`
  - [ ] `TELEGRAM_RESULTS_END` → `DISCORD_RESULTS_END`
- [ ] Update default argument: `user_id: str = "telegram_user"` → `user_id: str = "discord_user"`
- [ ] Update usage message in `__main__`: "telegram_main.py" → "discord_main.py"

### **Step 2: Add Discord Event Handler**

- [ ] Open `/src/plugin.ts`
- [ ] Find the `events` section (around line 389)
- [ ] Add `DISCORD_MESSAGE_RECEIVED: [` handler after `TELEGRAM_MESSAGE_RECEIVED`
- [ ] Copy event handler code from instructions
- [ ] Update all instances:
  - [ ] `'telegram'` → `'discord'`
  - [ ] `TELEGRAM_RESULTS_START/END` → `DISCORD_RESULTS_START/END`
  - [ ] `telegram_${userId}` → `discord_${userId}`
  - [ ] `telegram_main.py` → `discord_main.py`
  - [ ] `TELEGRAM_MAX_LENGTH = 4000` → `DISCORD_MAX_LENGTH = 1900`
- [ ] Verify attachment access:
  - [ ] Using `originalMessage.attachments` (not `originalMessage.photo`)
  - [ ] Using `params.ctx?.author?.id` (not `params.ctx.from?.id`)

### **Step 3: Install Dependencies**

- [ ] Install Discord plugin: `bun add @elizaos/plugin-discord`
- [ ] Add to character plugins array (if not present)
- [ ] Verify `.env` has Discord credentials:
  - [ ] `DISCORD_APPLICATION_ID`
  - [ ] `DISCORD_API_TOKEN`

---

## ✅ Pre-Testing Verification

### **File Structure:**
- [ ] `/chronos/discord_main.py` exists
- [ ] `/src/plugin.ts` contains `DISCORD_MESSAGE_RECEIVED` handler
- [ ] `/.env` has Discord credentials

### **Code Verification:**
- [ ] All "telegram" references changed to "discord"
- [ ] All `TELEGRAM_` markers changed to `DISCORD_`
- [ ] Message limit is 1900 chars (not 4000)
- [ ] No syntax errors (check with `bun run build`)

### **Environment Check:**
- [ ] Neo4j running: `neo4j status` or check http://localhost:7474
- [ ] `.env` has all required keys:
  - [ ] `OPENAI_API_KEY`
  - [ ] `GOOGLE_API_KEY`
  - [ ] `FUTURE_HOUSE_API_KEY`
  - [ ] `NEO4J_URL`
  - [ ] `NEO4J_USERNAME`
  - [ ] `NEO4J_PASSWORD`
  - [ ] `DISCORD_APPLICATION_ID`
  - [ ] `DISCORD_API_TOKEN`

---

## 🧪 Testing

### **Build & Start:**
- [ ] Run: `bun run build`
- [ ] Build succeeds without errors
- [ ] Run: `elizaos start`
- [ ] Bot connects to Discord successfully

### **First Test:**
- [ ] Upload test image to Discord channel
- [ ] Bot responds: "⏳ Processing your image through Chronos pipeline..."
- [ ] Check terminal logs for:
  - [ ] "CHRONOS PIPELINE - DISCORD IMAGE PROCESSING"
  - [ ] "🧹 CLEARING NEO4J DATABASE"
  - [ ] "✅ Neo4j database cleared successfully"
  - [ ] "STARTING PIPELINE"
  - [ ] OCR processing logs
  - [ ] Knowledge graph creation logs
  - [ ] Pattern discovery logs
  - [ ] Hypothesis verification logs
  - [ ] "DISCORD_RESULTS_START"
  - [ ] Questions and answers
  - [ ] "DISCORD_RESULTS_END"
- [ ] Bot sends: "✅ Chronos Analysis Complete!"
- [ ] Bot sends hypothesis results
- [ ] Results are complete (not truncated)

### **Second Test (Isolation Verification):**
- [ ] Upload DIFFERENT test image
- [ ] Verify you get DIFFERENT hypotheses
- [ ] If hypotheses are the same, check:
  - [ ] Neo4j clearing is working
  - [ ] Terminal shows "✅ Neo4j database cleared successfully"

---

## 🐛 Troubleshooting Checklist

### **Issue: "No DISCORD_RESULTS block found"**
- [ ] Check terminal for Python errors
- [ ] Verify Neo4j is running
- [ ] Verify all API keys are valid
- [ ] Check FutureHouse API rate limit

### **Issue: Results truncated**
- [ ] Verify `DISCORD_MAX_LENGTH = 1900`
- [ ] Check message splitting logic is present
- [ ] Verify using correct source: `'discord'`

### **Issue: Same hypotheses for different images**
- [ ] Verify `clear_neo4j_database()` is called
- [ ] Check Neo4j connection successful
- [ ] Verify terminal shows "✅ Neo4j database cleared"

### **Issue: Python module not found**
- [ ] Install: `cd chronos && pip install -r requirements.txt`
- [ ] Verify Python path includes `chronos/app`

---

## 🎉 Success Criteria

Integration is complete when:
- [ ] User uploads image to Discord
- [ ] Bot acknowledges processing
- [ ] Terminal shows full pipeline execution
- [ ] Bot sends complete hypothesis results
- [ ] Results are properly formatted and not truncated
- [ ] Different images produce different hypotheses
- [ ] No errors in terminal or Discord

---

## 📊 Common Mistakes to Avoid

- [ ] ❌ Forgot to change output markers (TELEGRAM → DISCORD)
- [ ] ❌ Using wrong message limit (4000 instead of 1900)
- [ ] ❌ Wrong source in callbacks ('telegram' instead of 'discord')
- [ ] ❌ Forgot to clear Neo4j before processing
- [ ] ❌ Reading results from files instead of stdout
- [ ] ❌ Hardcoded credentials instead of using .env

---

## 📁 Files Modified Summary

**Created:**
- `/chronos/discord_main.py` (692 lines)

**Modified:**
- `/src/plugin.ts` (added ~300 lines for DISCORD_MESSAGE_RECEIVED handler)

**Total Changes:** ~1000 lines of code

---

**Print this checklist and mark items as you complete them!**
