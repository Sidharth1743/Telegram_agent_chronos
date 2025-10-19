import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/index.ts
import { logger as logger2 } from "@elizaos/core";

// src/plugin.ts
import {
  ModelType,
  Service,
  logger
} from "@elizaos/core";
import { z } from "zod";
var configSchema = z.object({
  EXAMPLE_PLUGIN_VARIABLE: z.string().min(1, "Example plugin variable is not provided").optional().transform((val) => {
    if (!val) {
      console.warn("Warning: Example plugin variable is not provided");
    }
    return val;
  })
});
var helloWorldAction = {
  name: "HELLO_WORLD",
  similes: ["GREET", "SAY_HELLO"],
  description: "Responds with a simple hello world message",
  validate: async (_runtime, _message, _state) => {
    return true;
  },
  handler: async (_runtime, message, _state, _options, callback, _responses) => {
    try {
      logger.info("Handling HELLO_WORLD action");
      const responseContent = {
        text: "hello world!",
        actions: ["HELLO_WORLD"],
        source: message.content.source
      };
      await callback(responseContent);
      return {
        text: "Sent hello world greeting",
        values: {
          success: true,
          greeted: true
        },
        data: {
          actionName: "HELLO_WORLD",
          messageId: message.id,
          timestamp: Date.now()
        },
        success: true
      };
    } catch (error) {
      logger.error({ error }, "Error in HELLO_WORLD action:");
      return {
        text: "Failed to send hello world greeting",
        values: {
          success: false,
          error: "GREETING_FAILED"
        },
        data: {
          actionName: "HELLO_WORLD",
          error: error instanceof Error ? error.message : String(error)
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  },
  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Can you say hello?"
        }
      },
      {
        name: "{{name2}}",
        content: {
          text: "hello world!",
          actions: ["HELLO_WORLD"]
        }
      }
    ]
  ]
};
var helloWorldProvider = {
  name: "HELLO_WORLD_PROVIDER",
  description: "A simple example provider",
  get: async (_runtime, _message, _state) => {
    return {
      text: "I am a provider",
      values: {},
      data: {}
    };
  }
};

class StarterService extends Service {
  static serviceType = "starter";
  capabilityDescription = "This is a starter service which is attached to the agent through the starter plugin.";
  constructor(runtime) {
    super(runtime);
  }
  static async start(runtime) {
    logger.info("*** Starting starter service ***");
    const service = new StarterService(runtime);
    return service;
  }
  static async stop(runtime) {
    logger.info("*** Stopping starter service ***");
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error("Starter service not found");
    }
    service.stop();
  }
  async stop() {
    logger.info("*** Stopping starter service instance ***");
  }
}
var plugin = {
  name: "starter",
  description: "A starter plugin for Eliza",
  priority: -1000,
  config: {
    EXAMPLE_PLUGIN_VARIABLE: process.env.EXAMPLE_PLUGIN_VARIABLE
  },
  async init(config) {
    logger.info("*** Initializing starter plugin ***");
    try {
      const validatedConfig = await configSchema.parseAsync(config);
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value)
          process.env[key] = value;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid plugin configuration: ${error.errors.map((e) => e.message).join(", ")}`);
      }
      throw error;
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (_runtime, { prompt, stopSequences = [] }) => {
      return "Never gonna give you up, never gonna let you down, never gonna run around and desert you...";
    },
    [ModelType.TEXT_LARGE]: async (_runtime, {
      prompt,
      stopSequences = [],
      maxTokens = 8192,
      temperature = 0.7,
      frequencyPenalty = 0.7,
      presencePenalty = 0.7
    }) => {
      return "Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...";
    }
  },
  routes: [
    {
      name: "helloworld",
      path: "/helloworld",
      type: "GET",
      handler: async (_req, res) => {
        res.json({
          message: "Hello World!"
        });
      }
    }
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.info("MESSAGE_RECEIVED event received");
        logger.info({ keys: Object.keys(params) }, "MESSAGE_RECEIVED param keys");
      }
    ],
    TELEGRAM_MESSAGE_RECEIVED: [
      async (params) => {
        logger.info("TELEGRAM_MESSAGE_RECEIVED event received");
        const originalMessage = params.originalMessage;
        if (originalMessage && originalMessage.photo && originalMessage.photo.length > 0) {
          try {
            const photo = originalMessage.photo[originalMessage.photo.length - 1];
            const userId = params.ctx.from?.id?.toString() || "unknown";
            logger.info({ photo, userId }, "Telegram photo detected, starting Chronos pipeline");
            if (params.callback) {
              await params.callback({
                text: `⏳ Processing your image through Chronos pipeline...

This will:
1. Extract text (OCR)
2. Build knowledge graph
3. Discover patterns
4. Verify hypotheses

This may take 1-2 minutes. Please wait...`,
                source: "telegram"
              });
            }
            const bot = params.ctx.telegram;
            const fileLink = await bot.getFileLink(photo.file_id);
            const imageUrl = fileLink.toString();
            logger.info({ imageUrl }, "Downloading image from Telegram");
            const fs = await import("fs");
            const path = await import("path");
            const https = await import("https");
            const tempDir = path.join(process.cwd(), "temp_images");
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            const timestamp = Date.now();
            const imagePath = path.join(tempDir, `telegram_${userId}_${timestamp}.jpg`);
            await new Promise((resolve, reject) => {
              const file = fs.createWriteStream(imagePath);
              https.get(imageUrl, (response) => {
                response.pipe(file);
                file.on("finish", () => {
                  file.close();
                  resolve(true);
                });
              }).on("error", (err) => {
                fs.unlinkSync(imagePath);
                reject(err);
              });
            });
            logger.info({ imagePath }, "Image downloaded successfully");
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);
            const chronosScript = path.join(process.cwd(), "chronos", "telegram_main.py");
            logger.info({ chronosScript, imagePath, userId }, "Calling Chronos pipeline");
            const { stdout, stderr } = await execAsync(`python3 "${chronosScript}" "${imagePath}" "${userId}"`, {
              maxBuffer: 10485760,
              timeout: 1800000
            });
            logger.info("Chronos pipeline completed, parsing results");
            if (stderr) {
              logger.warn({ stderr }, "Chronos pipeline stderr");
            }
            const resultsMatch = stdout.match(/TELEGRAM_RESULTS_START\n={80}\n([\s\S]*?)\n={80}\nTELEGRAM_RESULTS_END/);
            if (resultsMatch && resultsMatch[1]) {
              const resultsBlock = resultsMatch[1];
              const questions = [];
              const answers = [];
              const qaPairs = resultsBlock.split("---").filter((pair) => pair.trim().length > 0);
              for (const pair of qaPairs) {
                const lines = pair.trim().split(`
`);
                let currentQuestion = "";
                let currentAnswerLines = [];
                let inAnswer = false;
                for (const line of lines) {
                  if (line.startsWith("QUESTION_")) {
                    const question = line.split(":::")[1];
                    if (question)
                      currentQuestion = question.trim();
                  } else if (line.startsWith("ANSWER_")) {
                    const answerFirstLine = line.split(":::")[1];
                    if (answerFirstLine)
                      currentAnswerLines.push(answerFirstLine.trim());
                    inAnswer = true;
                  } else if (inAnswer && line.trim()) {
                    currentAnswerLines.push(line.trim());
                  }
                }
                if (currentQuestion)
                  questions.push(currentQuestion);
                if (currentAnswerLines.length > 0) {
                  answers.push(currentAnswerLines.join(`

`));
                }
              }
              if (questions.length > 0 && answers.length > 0) {
                for (let i = 0;i < Math.min(questions.length, answers.length); i++) {
                  const question = questions[i];
                  const answer = answers[i];
                  const paragraphs = answer.split(`

`).filter((p) => p.trim().length > 0);
                  if (paragraphs.length === 0) {
                    if (params.callback) {
                      await params.callback({
                        text: `
${i + 1}. ${question}

Answer: ${answer}`,
                        source: "telegram"
                      });
                    }
                  } else {
                    if (params.callback) {
                      await params.callback({
                        text: `
${i + 1}. ${question}

Answer: ${paragraphs[0]}`,
                        source: "telegram"
                      });
                    }
                    for (let j = 1;j < paragraphs.length; j++) {
                      if (params.callback) {
                        await params.callback({
                          text: `Continuation: ${paragraphs[j]}`,
                          source: "telegram"
                        });
                      }
                    }
                  }
                }
                logger.info(`Successfully sent ${questions.length} hypothesis results to Telegram`);
              } else {
                logger.warn("No valid results parsed from stdout");
                if (params.callback) {
                  await params.callback({
                    text: `⚠️ Processing completed but no hypothesis results were generated.

This might happen if:
- No patterns were found in the image
- The image text was too short
- OCR extraction failed

Check the server logs for details.`,
                    source: "telegram"
                  });
                }
              }
            } else {
              logger.warn("No TELEGRAM_RESULTS block found in stdout");
              if (params.callback) {
                await params.callback({
                  text: `⚠️ Processing completed but results could not be parsed.

Check the logs for detailed output.`,
                  source: "telegram"
                });
              }
            }
            try {
              fs.unlinkSync(imagePath);
              logger.info("Temp image cleaned up");
            } catch (cleanupError) {
              logger.warn({ cleanupError }, "Failed to cleanup temp image");
            }
          } catch (error) {
            logger.error({ error }, "Error processing Telegram photo with Chronos");
            if (params.callback) {
              await params.callback({
                text: `❌ Error processing image: ${error instanceof Error ? error.message : String(error)}

Please check the logs for more details.`,
                source: "telegram"
              });
            }
          }
        }
      }
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.info("VOICE_MESSAGE_RECEIVED event received");
        logger.info({ keys: Object.keys(params) }, "VOICE_MESSAGE_RECEIVED param keys");
      }
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.info("WORLD_CONNECTED event received");
        logger.info({ keys: Object.keys(params) }, "WORLD_CONNECTED param keys");
      }
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.info("WORLD_JOINED event received");
        logger.info({ keys: Object.keys(params) }, "WORLD_JOINED param keys");
      }
    ]
  },
  services: [StarterService],
  actions: [helloWorldAction],
  providers: [helloWorldProvider]
};
var plugin_default = plugin;

// src/character.ts
var character = {
  name: "Eliza",
  plugins: [
    "@elizaos/plugin-sql",
    ...process.env.ANTHROPIC_API_KEY?.trim() ? ["@elizaos/plugin-anthropic"] : [],
    ...process.env.OPENROUTER_API_KEY?.trim() ? ["@elizaos/plugin-openrouter"] : [],
    ...process.env.OPENAI_API_KEY?.trim() ? ["@elizaos/plugin-openai"] : [],
    ...process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ? ["@elizaos/plugin-google-genai"] : [],
    ...process.env.OLLAMA_API_ENDPOINT?.trim() ? ["@elizaos/plugin-ollama"] : [],
    ...process.env.DISCORD_API_TOKEN?.trim() ? ["@elizaos/plugin-discord"] : [],
    ...process.env.TWITTER_API_KEY?.trim() && process.env.TWITTER_API_SECRET_KEY?.trim() && process.env.TWITTER_ACCESS_TOKEN?.trim() && process.env.TWITTER_ACCESS_TOKEN_SECRET?.trim() ? ["@elizaos/plugin-twitter"] : [],
    ...process.env.TELEGRAM_BOT_TOKEN?.trim() ? ["@elizaos/plugin-telegram"] : [],
    ...!process.env.IGNORE_BOOTSTRAP ? ["@elizaos/plugin-bootstrap"] : []
  ],
  settings: {
    secrets: {},
    avatar: "https://elizaos.github.io/eliza-avatars/Eliza/portrait.png"
  },
  system: "Respond to all messages in a helpful, conversational manner. Provide assistance on a wide range of topics, using knowledge when needed. Be concise but thorough, friendly but professional. Use humor when appropriate and be empathetic to user needs. Provide valuable information and insights when questions are asked.",
  bio: [
    "Engages with all types of questions and conversations",
    "Provides helpful, concise responses",
    "Uses knowledge resources effectively when needed",
    "Balances brevity with completeness",
    "Uses humor and empathy appropriately",
    "Adapts tone to match the conversation context",
    "Offers assistance proactively",
    "Communicates clearly and directly"
  ],
  topics: [
    "general knowledge and information",
    "problem solving and troubleshooting",
    "technology and software",
    "community building and management",
    "business and productivity",
    "creativity and innovation",
    "personal development",
    "communication and collaboration",
    "education and learning",
    "entertainment and media"
  ],
  messageExamples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "This user keeps derailing technical discussions with personal problems."
        }
      },
      {
        name: "Eliza",
        content: {
          text: "DM them. Sounds like they need to talk about something else."
        }
      },
      {
        name: "{{name1}}",
        content: {
          text: "I tried, they just keep bringing drama back to the main channel."
        }
      },
      {
        name: "Eliza",
        content: {
          text: "Send them my way. I've got time today."
        }
      }
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I can't handle being a mod anymore. It's affecting my mental health."
        }
      },
      {
        name: "Eliza",
        content: {
          text: "Drop the channels. You come first."
        }
      },
      {
        name: "{{name1}}",
        content: {
          text: "But who's going to handle everything?"
        }
      },
      {
        name: "Eliza",
        content: {
          text: "We will. Take the break. Come back when you're ready."
        }
      }
    ]
  ],
  style: {
    all: [
      "Keep responses concise but informative",
      "Use clear and direct language",
      "Be engaging and conversational",
      "Use humor when appropriate",
      "Be empathetic and understanding",
      "Provide helpful information",
      "Be encouraging and positive",
      "Adapt tone to the conversation",
      "Use knowledge resources when needed",
      "Respond to all types of questions"
    ],
    chat: [
      "Be conversational and natural",
      "Engage with the topic at hand",
      "Be helpful and informative",
      "Show personality and warmth"
    ]
  }
};

// src/index.ts
var initCharacter = ({ runtime }) => {
  logger2.info("Initializing character");
  logger2.info({ name: character.name }, "Name:");
};
var projectAgent = {
  character,
  init: async (runtime) => await initCharacter({ runtime }),
  plugins: [plugin_default]
};
var project = {
  agents: [projectAgent]
};
var src_default = project;
export {
  projectAgent,
  src_default as default,
  character
};

//# debugId=008DCE42948CA68164756E2164756E21
//# sourceMappingURL=index.js.map
