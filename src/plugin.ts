import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
} from '@elizaos/core';
import { z } from 'zod';

/**
 * Define the configuration schema for the plugin with the following properties:
 *
 * @param {string} EXAMPLE_PLUGIN_VARIABLE - The name of the plugin (min length of 1, optional)
 * @returns {object} - The configured schema object
 */
const configSchema = z.object({
  EXAMPLE_PLUGIN_VARIABLE: z
    .string()
    .min(1, 'Example plugin variable is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn('Warning: Example plugin variable is not provided');
      }
      return val;
    }),
});

/**
 * Example HelloWorld action
 * This demonstrates the simplest possible action structure
 */
/**
 * Represents an action that responds with a simple hello world message.
 *
 * @typedef {Object} Action
 * @property {string} name - The name of the action
 * @property {string[]} similes - The related similes of the action
 * @property {string} description - Description of the action
 * @property {Function} validate - Validation function for the action
 * @property {Function} handler - The function that handles the action
 * @property {Object[]} examples - Array of examples for the action
 */
const helloWorldAction: Action = {
  name: 'HELLO_WORLD',
  similes: ['GREET', 'SAY_HELLO'],
  description: 'Responds with a simple hello world message',

  validate: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    // Always valid
    return true;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Handling HELLO_WORLD action');

      // Simple response content
      const responseContent: Content = {
        text: 'hello world!',
        actions: ['HELLO_WORLD'],
        source: message.content.source,
      };

      // Call back with the hello world message
      await callback(responseContent);

      return {
        text: 'Sent hello world greeting',
        values: {
          success: true,
          greeted: true,
        },
        data: {
          actionName: 'HELLO_WORLD',
          messageId: message.id,
          timestamp: Date.now(),
        },
        success: true,
      };
    } catch (error) {
      logger.error({ error }, 'Error in HELLO_WORLD action:');

      return {
        text: 'Failed to send hello world greeting',
        values: {
          success: false,
          error: 'GREETING_FAILED',
        },
        data: {
          actionName: 'HELLO_WORLD',
          error: error instanceof Error ? error.message : String(error),
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Can you say hello?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'hello world!',
          actions: ['HELLO_WORLD'],
        },
      },
    ],
  ],
};

/**
 * Telegram Image Handler Action
 * Detects and processes images sent via Telegram
 */
const telegramImageAction: Action = {
  name: 'PROCESS_TELEGRAM_IMAGE',
  similes: ['ANALYZE_IMAGE', 'DESCRIBE_IMAGE', 'VIEW_IMAGE'],
  description: 'Processes and analyzes images uploaded via Telegram',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    // Check if message has attachments
    const hasAttachments =
      message.content.attachments && Array.isArray(message.content.attachments);
    if (!hasAttachments) return false;

    // Check if any attachment is an image
    const hasImage = message.content.attachments.some(
      (attachment: any) => attachment.type === 'image' || attachment.contentType?.startsWith('image/')
    );

    logger.info({ hasImage, attachments: message.content.attachments }, 'Image validation');
    return hasImage;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Processing Telegram image');

      // Extract image attachments
      const imageAttachments = message.content.attachments?.filter(
        (attachment: any) =>
          attachment.type === 'image' || attachment.contentType?.startsWith('image/')
      );

      if (!imageAttachments || imageAttachments.length === 0) {
        return {
          text: 'No images found in message',
          success: false,
        };
      }

      // Process each image
      const imageData = imageAttachments.map((attachment: any) => ({
        url: attachment.url,
        description: attachment.description || 'No description available',
        contentType: attachment.contentType,
        source: attachment.source || 'telegram',
      }));

      logger.info({ imageData }, 'Extracted image data');

      // Build response message
      let responseText = `I received ${imageAttachments.length} image(s):\n\n`;
      imageAttachments.forEach((img: any, idx: number) => {
        responseText += `Image ${idx + 1}:\n`;
        responseText += `- URL: ${img.url}\n`;
        if (img.description && img.description !== 'No description available') {
          responseText += `- Description: ${img.description}\n`;
        }
        responseText += '\n';
      });

      // Create response content
      const responseContent: Content = {
        text: responseText,
        actions: ['PROCESS_TELEGRAM_IMAGE'],
        source: message.content.source,
        metadata: {
          imageCount: imageAttachments.length,
          images: imageData,
        },
      };

      // Send response to user
      await callback(responseContent);

      return {
        text: `Successfully processed ${imageAttachments.length} image(s)`,
        values: {
          success: true,
          imageCount: imageAttachments.length,
          images: imageData,
        },
        data: {
          actionName: 'PROCESS_TELEGRAM_IMAGE',
          messageId: message.id,
          timestamp: Date.now(),
          imageData,
        },
        success: true,
      };
    } catch (error) {
      logger.error({ error }, 'Error processing Telegram image:');

      return {
        text: 'Failed to process image',
        values: {
          success: false,
          error: 'IMAGE_PROCESSING_FAILED',
        },
        data: {
          actionName: 'PROCESS_TELEGRAM_IMAGE',
          error: error instanceof Error ? error.message : String(error),
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Here is a photo',
          attachments: [
            {
              type: 'image',
              url: 'https://api.telegram.org/file/bot<token>/photo.jpg',
              description: 'A sample photo',
            },
          ],
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'I received 1 image(s):\n\nImage 1:\n- URL: https://api.telegram.org/file/bot<token>/photo.jpg\n- Description: A sample photo',
          actions: ['PROCESS_TELEGRAM_IMAGE'],
        },
      },
    ],
  ],
};

/**
 * Example Hello World Provider
 * This demonstrates the simplest possible provider implementation
 */
const helloWorldProvider: Provider = {
  name: 'HELLO_WORLD_PROVIDER',
  description: 'A simple example provider',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    return {
      text: 'I am a provider',
      values: {},
      data: {},
    };
  },
};

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('*** Starting starter service ***');
    const service = new StarterService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** Stopping starter service ***');
    // get the service from the runtime
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error('Starter service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** Stopping starter service instance ***');
  }
}

const plugin: Plugin = {
  name: 'starter',
  description: 'A starter plugin for Eliza',
  // Set lowest priority so real models take precedence
  priority: -1000,
  config: {
    EXAMPLE_PLUGIN_VARIABLE: process.env.EXAMPLE_PLUGIN_VARIABLE,
  },
  async init(config: Record<string, string>) {
    logger.info('*** Initializing starter plugin ***');
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
    },
  },
  routes: [
    {
      name: 'helloworld',
      path: '/helloworld',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        // send a response
        res.json({
          message: 'Hello World!',
        });
      },
    },
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.info('MESSAGE_RECEIVED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'MESSAGE_RECEIVED param keys');
      },
    ],
    TELEGRAM_MESSAGE_RECEIVED: [
      async (params: any) => {
        logger.info('TELEGRAM_MESSAGE_RECEIVED event received');

        // Check if the original Telegram message has a photo
        const originalMessage = params.originalMessage;
        if (originalMessage && originalMessage.photo && originalMessage.photo.length > 0) {
          try {
            // Get the highest resolution photo
            const photo = originalMessage.photo[originalMessage.photo.length - 1];
            const userId = params.ctx.from?.id?.toString() || 'unknown';

            logger.info({ photo, userId }, 'Telegram photo detected, starting Chronos pipeline');

            // Send initial acknowledgment
            if (params.callback) {
              await params.callback({
                text: '⏳ Processing your image through Chronos pipeline...\n\nThis will:\n1. Extract text (OCR)\n2. Build knowledge graph\n3. Discover patterns\n4. Verify hypotheses\n\nThis may take 1-2 minutes. Please wait...',
                source: 'telegram',
              });
            }

            // Download image
            const bot = params.ctx.telegram;
            const fileLink = await bot.getFileLink(photo.file_id);
            const imageUrl = fileLink.toString();

            logger.info({ imageUrl }, 'Downloading image from Telegram');

            // Download to temp file
            const fs = await import('fs');
            const path = await import('path');
            const https = await import('https');

            const tempDir = path.join(process.cwd(), 'temp_images');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            const timestamp = Date.now();
            const imagePath = path.join(tempDir, `telegram_${userId}_${timestamp}.jpg`);

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

            const chronosScript = path.join(process.cwd(), 'chronos', 'telegram_main.py');

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

            // Parse results from stdout between TELEGRAM_RESULTS_START and TELEGRAM_RESULTS_END
            const resultsMatch = stdout.match(/TELEGRAM_RESULTS_START\n={80}\n([\s\S]*?)\n={80}\nTELEGRAM_RESULTS_END/);

            if (resultsMatch && resultsMatch[1]) {
              const resultsBlock = resultsMatch[1];

              // Parse questions and answers (handling multi-line answers)
              const questions: string[] = [];
              const answers: string[] = [];

              // Split by the --- separator to get each Q&A pair
              const qaPairs = resultsBlock.split('---').filter(pair => pair.trim().length > 0);

              for (const pair of qaPairs) {
                const lines = pair.trim().split('\n');
                let currentQuestion = '';
                let currentAnswerLines: string[] = [];
                let inAnswer = false;

                for (const line of lines) {
                  if (line.startsWith('QUESTION_')) {
                    const question = line.split(':::')[1];
                    if (question) currentQuestion = question.trim();
                  } else if (line.startsWith('ANSWER_')) {
                    const answerFirstLine = line.split(':::')[1];
                    if (answerFirstLine) currentAnswerLines.push(answerFirstLine.trim());
                    inAnswer = true;
                  } else if (inAnswer && line.trim()) {
                    // Continuation of the answer
                    currentAnswerLines.push(line.trim());
                  }
                }

                if (currentQuestion) questions.push(currentQuestion);
                if (currentAnswerLines.length > 0) {
                  // Join all answer lines back together with newlines
                  answers.push(currentAnswerLines.join('\n\n'));
                }
              }

              if (questions.length > 0 && answers.length > 0) {
                // Send each Q&A pair, splitting long answers by paragraph
                for (let i = 0; i < Math.min(questions.length, answers.length); i++) {
                  const question = questions[i];
                  const answer = answers[i];

                  // Split answer by paragraphs (double newline)
                  const paragraphs = answer.split('\n\n').filter(p => p.trim().length > 0);

                  if (paragraphs.length === 0) {
                    // No paragraphs, send as-is
                    if (params.callback) {
                      await params.callback({
                        text: `\n${i + 1}. ${question}\n\nAnswer: ${answer}`,
                        source: 'telegram',
                      });
                    }
                  } else {
                    // Send first paragraph with question
                    if (params.callback) {
                      await params.callback({
                        text: `\n${i + 1}. ${question}\n\nAnswer: ${paragraphs[0]}`,
                        source: 'telegram',
                      });
                    }

                    // Send remaining paragraphs as continuations
                    for (let j = 1; j < paragraphs.length; j++) {
                      if (params.callback) {
                        await params.callback({
                          text: `Continuation: ${paragraphs[j]}`,
                          source: 'telegram',
                        });
                      }
                    }
                  }
                }

                logger.info(`Successfully sent ${questions.length} hypothesis results to Telegram`);
              } else {
                logger.warn('No valid results parsed from stdout');
                if (params.callback) {
                  await params.callback({
                    text: '⚠️ Processing completed but no hypothesis results were generated.\n\nThis might happen if:\n- No patterns were found in the image\n- The image text was too short\n- OCR extraction failed\n\nCheck the server logs for details.',
                    source: 'telegram',
                  });
                }
              }
            } else {
              // No results block found in stdout
              logger.warn('No TELEGRAM_RESULTS block found in stdout');
              if (params.callback) {
                await params.callback({
                  text: '⚠️ Processing completed but results could not be parsed.\n\nCheck the logs for detailed output.',
                  source: 'telegram',
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
            logger.error({ error }, 'Error processing Telegram photo with Chronos');

            if (params.callback) {
              await params.callback({
                text: `❌ Error processing image: ${error instanceof Error ? error.message : String(error)}\n\nPlease check the logs for more details.`,
                source: 'telegram',
              });
            }
          }
        }
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.info('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'VOICE_MESSAGE_RECEIVED param keys');
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.info('WORLD_CONNECTED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'WORLD_CONNECTED param keys');
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.info('WORLD_JOINED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'WORLD_JOINED param keys');
      },
    ],
  },
  services: [StarterService],
  actions: [helloWorldAction],
  providers: [helloWorldProvider],
};

export default plugin;
