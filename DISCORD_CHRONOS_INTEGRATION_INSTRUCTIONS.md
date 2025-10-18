# Discord Bot - Chronos Pipeline Integration Instructions

**For Claude Code Agent:** Follow these instructions to integrate the existing Chronos pipeline with a Discord bot in ElizaOS.

---

## ⚠️ CRITICAL WARNINGS - Read First!

### **What NOT to Do:**

1. ❌ **DO NOT skip Neo4j** - It's ESSENTIAL for pattern discovery, not just storage
2. ❌ **DO NOT create a new pipeline implementation** - Use the existing `run_pipeline()` from `chronos/app/pipeline.py`
3. ❌ **DO NOT try to mimic the pipeline** - Call it via subprocess
4. ❌ **DO NOT read results from files** - Parse from stdout to avoid race conditions
5. ❌ **DO NOT hardcode credentials** - All values must come from `.env`
6. ❌ **DO NOT forget to clear Neo4j** - Each image needs isolated analysis

---

## 📋 Working Architecture Overview (Telegram - Reference)

```
User uploads image to Telegram
    ↓
ElizaOS plugin.ts (TELEGRAM_MESSAGE_RECEIVED event)
    ↓
Downloads image to temp_images/ folder
    ↓
Calls: python3 chronos/telegram_main.py <image_path> <user_id>
    ↓
telegram_main.py executes:
    1. Clear Neo4j database (isolated analysis)
    2. OCR extraction (Gemini API)
    3. Knowledge Graph building (OpenAI GPT-4o-mini → Neo4j)
    4. Pattern Discovery (Neo4j queries)
    5. Hypothesis Verification (FutureHouse API)
    6. Output structured results to stdout
    ↓
plugin.ts parses stdout between TELEGRAM_RESULTS_START/END markers
    ↓
Sends full hypothesis answers to Telegram (with smart message splitting)
```

---

## 🎯 Your Task: Discord Integration

You need to create the **exact same architecture** but for Discord instead of Telegram.

---

## 📁 Files You'll Work With

### **Files to CREATE:**
1. `/chronos/discord_main.py` - Discord-specific wrapper (copy and adapt from `telegram_main.py`)

### **Files to MODIFY:**
1. `/src/plugin.ts` - Add Discord event handler (similar to TELEGRAM_MESSAGE_RECEIVED)
2. `/.env` - Add Discord bot token (if not already present)

### **Files to REFERENCE (DO NOT MODIFY):**
- `/chronos/telegram_main.py` - Working reference implementation
- `/chronos/app/pipeline.py` - The actual Chronos pipeline
- `/chronos/app/neo4j_cleanup.py` - Neo4j database cleanup utility

---

## 🔧 Step-by-Step Implementation

### **Step 1: Create `discord_main.py`**

Create `/chronos/discord_main.py` by copying `/chronos/telegram_main.py` and making these changes:

```python
"""
Discord-specific wrapper for Chronos main.py
Processes a single image and returns hypothesis results
"""

import sys
import os
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from pipeline import run_pipeline
from neo4j_utils import verify_knowledge_graph
from kg_pattern_discovery import KGPatternDiscovery
from hypothesis_verifier import HypothesisVerifier
from neo4j_cleanup import clear_neo4j_database
from datetime import datetime


def process_discord_image(image_path: str, user_id: str = "discord_user"):
    """
    Process a single Discord image through the full Chronos pipeline.

    Args:
        image_path: Path to the downloaded image
        user_id: Discord user ID for tracking
    """

    # Configuration
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    element_id = f"discord_{user_id}_{timestamp}"

    chronos_dir = Path(__file__).parent
    output_text_file = chronos_dir / "chronos_output" / f"{element_id}_text.txt"
    output_text_file.parent.mkdir(exist_ok=True)

    # Neo4j Configuration from environment
    from dotenv import load_dotenv
    load_dotenv(chronos_dir.parent / ".env")

    NEO4J_URL = os.environ.get("NEO4J_URL", "neo4j://127.0.0.1:7687")
    NEO4J_USERNAME = os.environ.get("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "0123456789")

    # OCR Settings for images
    OCR_CONFIG = {
        "ocr_preprocessing": True,
        "enhancement_level": "aggressive",
        "use_high_dpi": False,  # Not used for images, only PDFs
        "use_advanced_ocr": True,
        "medical_context": True,
        "save_debug_images": False,
        "try_native_text": False,  # Images don't have native text
    }

    # KG Config
    KG_CONFIG = {
        "use_advanced_kg": False,  # Use GPT-4o-mini (cost effective)
        "kg_chunk_size": 10000,
        "enable_chunking": True,
        "element_id": element_id
    }

    print("\n" + "="*80)
    print("🚀 CHRONOS PIPELINE - DISCORD IMAGE PROCESSING")
    print("="*80)
    print(f"📷 Image: {Path(image_path).name}")
    print(f"👤 User: {user_id}")
    print(f"🆔 Element: {element_id}")
    print(f"⏰ Started: {datetime.now().strftime('%H:%M:%S')}")
    print("="*80)

    try:
        # STEP 0: Clear Neo4j database for isolated analysis
        print("\n" + "="*80)
        print("🧹 CLEARING NEO4J DATABASE")
        print("="*80)
        print(f"Clearing previous data to ensure isolated analysis for user {user_id}...")

        clear_success = clear_neo4j_database(
            neo4j_url=NEO4J_URL,
            neo4j_username=NEO4J_USERNAME,
            neo4j_password=NEO4J_PASSWORD
        )

        if not clear_success:
            print("⚠️  Warning: Neo4j cleanup may have failed, continuing anyway...")

        # Run pipeline
        print("\n" + "="*80)
        print("STARTING PIPELINE")
        print("="*80)

        extracted_text, graph_elements = run_pipeline(
            input_file=image_path,
            output_text_file=str(output_text_file),
            neo4j_url=NEO4J_URL,
            neo4j_username=NEO4J_USERNAME,
            neo4j_password=NEO4J_PASSWORD,
            **OCR_CONFIG,
            **KG_CONFIG
        )

        print(f"\n✅ Pipeline complete - {len(extracted_text):,} characters extracted")

        # Pattern Discovery & Hypothesis Verification
        print("\n" + "="*80)
        print("🔍 PATTERN DISCOVERY & HYPOTHESIS VERIFICATION")
        print("="*80)

        try:
            # Discover patterns
            print("\n📊 Discovering patterns in knowledge graph...")
            pattern_discovery = KGPatternDiscovery(
                neo4j_url=NEO4J_URL,
                neo4j_username=NEO4J_USERNAME,
                neo4j_password=NEO4J_PASSWORD
            )

            patterns = pattern_discovery.discover_patterns(
                max_length=3,
                max_patterns_per_length=5
            )
            pattern_discovery.close()

            # Extract questions
            questions = [p['question'] for p in patterns if p.get('question')]

            if not questions:
                print("\n⚠️  No questions generated from patterns")
                return

            print(f"\n✅ Generated {len(questions)} questions")

            # Verify hypotheses
            print("\n🔬 Verifying hypotheses with FutureHouse API...")
            verifier = HypothesisVerifier(output_dir=str(chronos_dir / "hypothesis_results"))
            results = verifier.verify_questions_sync(questions)

            print("\n" + "="*80)
            print("✅ PROCESSING COMPLETE")
            print("="*80)
            print(f"Total questions verified: {len(results)}")
            print(f"Results saved in: hypothesis_results/")

            # Output results in a parseable format for Discord bot
            print("\n" + "="*80)
            print("DISCORD_RESULTS_START")
            print("="*80)

            for i, result in enumerate(results, 1):
                print(f"QUESTION_{i}:::{result['question']}")
                print(f"ANSWER_{i}:::{result['owl_answer']}")
                print("---")

            print("="*80)
            print("DISCORD_RESULTS_END")
            print("="*80)

        except Exception as e:
            print(f"\n⚠️  Pattern discovery/verification failed: {e}")
            import traceback
            traceback.print_exc()

    except Exception as e:
        print(f"\n\n❌ PIPELINE FAILED: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python discord_main.py <image_path> [user_id]")
        sys.exit(1)

    image_path = sys.argv[1]
    user_id = sys.argv[2] if len(sys.argv) > 2 else "discord_user"

    if not os.path.exists(image_path):
        print(f"❌ Error: Image not found at {image_path}")
        sys.exit(1)

    process_discord_image(image_path, user_id)
```

**Changes from telegram_main.py:**
- Function name: `process_telegram_image` → `process_discord_image`
- Element ID prefix: `telegram_` → `discord_`
- Output markers: `TELEGRAM_RESULTS_START/END` → `DISCORD_RESULTS_START/END`
- Print banner: "TELEGRAM IMAGE PROCESSING" → "DISCORD IMAGE PROCESSING"

---

### **Step 2: Add Discord Event Handler in `plugin.ts`**

Find the `events` section in `/src/plugin.ts` and add a Discord message handler.

**Reference the working Telegram implementation at lines 397-227.**

Add this AFTER the TELEGRAM_MESSAGE_RECEIVED handler:

```typescript
DISCORD_MESSAGE_RECEIVED: [
  async (params: any) => {
    logger.info('DISCORD_MESSAGE_RECEIVED event received');

    // Check if the Discord message has attachments with images
    const originalMessage = params.originalMessage;
    if (originalMessage && originalMessage.attachments && originalMessage.attachments.size > 0) {
      try {
        // Find image attachments
        const imageAttachments = Array.from(originalMessage.attachments.values()).filter(
          (attachment: any) => attachment.contentType?.startsWith('image/')
        );

        if (imageAttachments.length === 0) {
          return; // No images to process
        }

        const attachment = imageAttachments[0]; // Process first image
        const userId = params.ctx?.author?.id?.toString() || 'unknown';

        logger.info({ attachment, userId }, 'Discord image detected, starting Chronos pipeline');

        // Send initial acknowledgment
        if (params.callback) {
          await params.callback({
            text: '⏳ Processing your image through Chronos pipeline...\n\nThis will:\n1. Extract text (OCR)\n2. Build knowledge graph\n3. Discover patterns\n4. Verify hypotheses\n\nThis may take 1-2 minutes. Please wait...',
            source: 'discord',
          });
        }

        // Download image from Discord CDN
        const imageUrl = attachment.url;
        logger.info({ imageUrl }, 'Downloading image from Discord');

        // Download to temp file
        const fs = await import('fs');
        const path = await import('path');
        const https = await import('https');

        const tempDir = path.join(process.cwd(), 'temp_images');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const timestamp = Date.now();
        const imagePath = path.join(tempDir, `discord_${userId}_${timestamp}.jpg`);

        // Download image
        await new Promise((resolve, reject) => {
          const file = fs.createWriteStream(imagePath);
          https.get(imageUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve(true);
            });
          }).on('error', (err) => {
            fs.unlinkSync(imagePath);
            reject(err);
          });
        });

        logger.info({ imagePath }, 'Image downloaded successfully');

        // Call Chronos pipeline via Python subprocess
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const chronosScript = path.join(process.cwd(), 'chronos', 'discord_main.py');

        logger.info({ chronosScript, imagePath, userId }, 'Calling Chronos pipeline');

        const { stdout, stderr } = await execAsync(
          `python3 "${chronosScript}" "${imagePath}" "${userId}"`,
          {
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer for output
            timeout: 1800000 // 30 minute timeout for long processing
          }
        );

        // Log the full output
        logger.info('Chronos pipeline completed, parsing results');
        if (stderr) {
          logger.warn({ stderr }, 'Chronos pipeline stderr');
        }

        // Parse results from stdout between DISCORD_RESULTS_START and DISCORD_RESULTS_END
        const resultsMatch = stdout.match(/DISCORD_RESULTS_START\n={80}\n([\s\S]*?)\n={80}\nDISCORD_RESULTS_END/);

        if (resultsMatch && resultsMatch[1]) {
          const resultsBlock = resultsMatch[1];

          // Parse questions and answers
          const questions: string[] = [];
          const answers: string[] = [];

          const lines = resultsBlock.split('\n');
          for (const line of lines) {
            if (line.startsWith('QUESTION_')) {
              const question = line.split(':::')[1];
              if (question) questions.push(question.trim());
            } else if (line.startsWith('ANSWER_')) {
              const answer = line.split(':::')[1];
              if (answer) answers.push(answer.trim());
            }
          }

          if (questions.length > 0 && answers.length > 0) {
            // Discord has a 2000 character limit per message (stricter than Telegram)
            const DISCORD_MAX_LENGTH = 1900; // Leave buffer for formatting

            // Send header message
            if (params.callback) {
              await params.callback({
                text: '✅ Chronos Analysis Complete!\n\n📊 Hypothesis Verification Results:',
                source: 'discord',
              });
            }

            // Send each Q&A pair as a separate message to avoid truncation
            for (let i = 0; i < Math.min(questions.length, answers.length); i++) {
              const question = questions[i];
              const answer = answers[i];

              let messageText = `\n${i + 1}. ${question}\n\n`;
              messageText += `Answer: ${answer}`;

              // If answer is too long for one message, split it
              if (messageText.length > DISCORD_MAX_LENGTH) {
                // Send question first
                if (params.callback) {
                  await params.callback({
                    text: `\n${i + 1}. ${question}\n\nAnswer (part 1):`,
                    source: 'discord',
                  });
                }

                // Split answer into chunks
                const answerChunks: string[] = [];
                let remainingAnswer = answer;

                while (remainingAnswer.length > 0) {
                  const chunkSize = DISCORD_MAX_LENGTH - 50; // Buffer for "part X" text
                  let chunk = remainingAnswer.substring(0, chunkSize);

                  // Try to break at a sentence or paragraph
                  if (remainingAnswer.length > chunkSize) {
                    const lastPeriod = chunk.lastIndexOf('. ');
                    const lastNewline = chunk.lastIndexOf('\n');
                    const breakPoint = Math.max(lastPeriod, lastNewline);

                    if (breakPoint > chunkSize * 0.7) {
                      chunk = chunk.substring(0, breakPoint + 1);
                    }
                  }

                  answerChunks.push(chunk);
                  remainingAnswer = remainingAnswer.substring(chunk.length).trim();
                }

                // Send each chunk
                for (let j = 0; j < answerChunks.length; j++) {
                  if (params.callback) {
                    const prefix = j === 0 ? '' : `Answer (part ${j + 1}): `;
                    await params.callback({
                      text: prefix + answerChunks[j],
                      source: 'discord',
                    });
                  }
                }
              } else {
                // Message fits in one, send it
                if (params.callback) {
                  await params.callback({
                    text: messageText,
                    source: 'discord',
                  });
                }
              }

              // Add separator between questions
              if (i < questions.length - 1 && params.callback) {
                await params.callback({
                  text: '---',
                  source: 'discord',
                });
              }
            }

            logger.info(`Successfully sent ${questions.length} hypothesis results to Discord`);
          } else {
            logger.warn('No valid results parsed from stdout');
            if (params.callback) {
              await params.callback({
                text: '⚠️ Processing completed but no hypothesis results were generated.\n\nThis might happen if:\n- No patterns were found in the image\n- The image text was too short\n- OCR extraction failed\n\nCheck the server logs for details.',
                source: 'discord',
              });
            }
          }
        } else {
          // No results block found in stdout
          logger.warn('No DISCORD_RESULTS block found in stdout');
          if (params.callback) {
            await params.callback({
              text: '⚠️ Processing completed but results could not be parsed.\n\nCheck the logs for detailed output.',
              source: 'discord',
            });
          }
        }

        // Clean up temp file
        try {
          fs.unlinkSync(imagePath);
          logger.info('Temp image cleaned up');
        } catch (cleanupError) {
          logger.warn({ cleanupError }, 'Failed to cleanup temp image');
        }

      } catch (error) {
        logger.error({ error }, 'Error processing Discord image with Chronos');

        if (params.callback) {
          await params.callback({
            text: `❌ Error processing image: ${error instanceof Error ? error.message : String(error)}\n\nPlease check the logs for more details.`,
            source: 'discord',
          });
        }
      }
    }
  },
],
```

**Key Differences from Telegram:**
- Event name: `TELEGRAM_MESSAGE_RECEIVED` → `DISCORD_MESSAGE_RECEIVED`
- Source: `'telegram'` → `'discord'`
- Message character limit: 4000 → 1900 (Discord is stricter)
- Attachment access: `originalMessage.photo` → `originalMessage.attachments`
- User ID access: `params.ctx.from?.id` → `params.ctx?.author?.id`
- Results markers: `TELEGRAM_RESULTS_START/END` → `DISCORD_RESULTS_START/END`
- Temp file prefix: `telegram_` → `discord_`

---

### **Step 3: Install Discord Plugin (if not already installed)**

```bash
cd /path/to/your/project
bun add @elizaos/plugin-discord
```

Add to your character configuration (if not already present):

```typescript
plugins: [
  '@elizaos/plugin-bootstrap',
  '@elizaos/plugin-sql',
  '@elizaos/plugin-openai',
  '@elizaos/plugin-discord',  // Add this
]
```

---

### **Step 4: Update `.env` File**

Ensure your `.env` file has Discord credentials:

```bash
# Discord Configuration
DISCORD_APPLICATION_ID=your-app-id
DISCORD_API_TOKEN=your-bot-token

# Existing Chronos Configuration (should already be there)
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIzaSy...
FUTURE_HOUSE_API_KEY=...
NEO4J_URL=neo4j://127.0.0.1:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=0123456789
```

---

## ✅ Testing

### **1. Build and Start:**

```bash
cd /path/to/your/project
bun run build
elizaos start
```

### **2. Test Discord Bot:**

1. Upload an image to your Discord channel
2. Watch the terminal logs for the Chronos pipeline execution
3. The bot should respond with hypothesis verification results

### **3. Expected Flow:**

```
1. User uploads image to Discord
2. Bot sends: "⏳ Processing your image through Chronos pipeline..."
3. Terminal shows: OCR → Knowledge Graph → Pattern Discovery → Hypothesis Verification
4. Bot sends: "✅ Chronos Analysis Complete!" + hypothesis results
```

---

## 🐛 Troubleshooting

### **Issue: "No DISCORD_RESULTS block found"**

**Cause:** Python script crashed or didn't output results
**Fix:** Check terminal logs for Python errors. Common causes:
- Neo4j not running
- API keys missing or invalid
- FutureHouse API rate limit hit

### **Issue: "Module not found" errors in Python**

**Cause:** Python dependencies not installed
**Fix:** Install Chronos dependencies:
```bash
cd chronos
pip install -r requirements.txt
```

### **Issue: Results are truncated**

**Cause:** Message exceeds Discord's 2000 character limit
**Fix:** Already handled by smart message splitting. If still truncated, reduce `DISCORD_MAX_LENGTH` further.

### **Issue: Same hypotheses for different images**

**Cause:** Neo4j not being cleared between images
**Fix:** Verify `clear_neo4j_database()` is being called successfully. Check Neo4j connection.

---

## 📊 Key Concepts

### **Why Clear Neo4j Before Each Image?**

Neo4j accumulates graphs from all previous images. Without clearing:
- Pattern discovery finds patterns across ALL historical images
- Same hypotheses returned regardless of new image content

Clearing ensures **isolated analysis** for each image.

### **Why Parse from stdout Instead of Files?**

Reading from files (`hypothesis_results/`) causes race conditions with multiple users:
- User A uploads image → processing starts → writes to `result_1.txt`
- User B uploads image → processing starts → writes to `result_2.txt`
- User A's bot might read `result_2.txt` by mistake

Parsing stdout ties results to the specific subprocess execution.

### **Why Use a Wrapper Script?**

The existing pipeline (`chronos/app/main.py`) is designed for:
- Interactive CLI usage
- PDF processing
- Direct file I/O

We need:
- Non-interactive execution
- Image processing
- Structured stdout output
- Platform-specific configuration (Discord vs Telegram)

The wrapper script (`discord_main.py`) adapts the pipeline for bot integration without modifying the core pipeline code.

---

## 📝 Summary

**What You're Creating:**
1. `discord_main.py` - Python wrapper that calls the Chronos pipeline and outputs structured results
2. Discord event handler in `plugin.ts` - Downloads images, calls Python script, parses results, sends to Discord

**What You're NOT Doing:**
- Modifying the core Chronos pipeline
- Implementing your own OCR/KG/hypothesis logic
- Skipping any pipeline steps

**Key Success Factors:**
- Use the existing pipeline through subprocess
- Clear Neo4j for isolated analysis
- Parse results from stdout (not files)
- Handle Discord's 2000 character limit
- Load all credentials from `.env`

---

## 🎯 Final Checklist

Before testing, verify:

- [ ] Created `chronos/discord_main.py` with correct output markers
- [ ] Added `DISCORD_MESSAGE_RECEIVED` event handler in `plugin.ts`
- [ ] Installed `@elizaos/plugin-discord` package
- [ ] Added Discord credentials to `.env`
- [ ] Neo4j is running and accessible
- [ ] All API keys are valid (OpenAI, Google, FutureHouse)
- [ ] Python dependencies are installed (`pip install -r chronos/requirements.txt`)
- [ ] Built the project (`bun run build`)

---

**Good luck! Follow these instructions carefully, and you'll have a working Discord integration that mirrors the successful Telegram implementation.** 🚀
