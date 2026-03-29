import { GoogleGenAI } from "@google/genai";
import { Config } from "../config/config";
import { Logger } from "../utils/logger";

enum ThinkingLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export class GeminiClient {
  private client: GoogleGenAI | null = null;
  private readonly config: Config;
  private readonly logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  private async initializeClient(): Promise<void> {
    if (!this.client) {
      this.logger.log("[GeminiClient] Initializing client...");
      if (this.config.googleCloudProjectId) {
        // Use Vertex AI with ADC
        this.logger.log(`[GeminiClient] Using Vertex AI with project: ${this.config.googleCloudProjectId}, location: ${this.config.googleCloudRegion}`);
        this.client = new GoogleGenAI({
          vertexai: true,
          project: this.config.googleCloudProjectId,
          location: this.config.googleCloudRegion,
        });
      } else {
        // Use API key mode
        this.logger.log("[GeminiClient] Using API key mode.");
        const key = this.config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!key) {
          this.logger.error("[GeminiClient] API key not found in config or environment.");
          throw new Error("Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable, or configure in VS Code settings.");
        }
        this.client = new GoogleGenAI({ apiKey: key });
      }
      this.logger.log("[GeminiClient] Client initialized successfully.");
    }
  }

  async generateDocumentation(prompt: string, systemInstruction?: string, thinkingLevel: string = "high"): Promise<string> {
    await this.initializeClient();

    let fullPrompt = prompt;
    if (systemInstruction) {
      fullPrompt = `${systemInstruction}\n\n${prompt}`;
    }

    const level = this.mapThinkingLevel(thinkingLevel);
    this.logger.log(`[GeminiClient] Generating content with model: ${this.config.model}, thinkingLevel: ${level}`);

    try {
      const startTime = Date.now();
      const response = await this.client!.models.generateContent({
        model: this.config.model,
        contents: fullPrompt,
        config: {
          thinkingConfig: {
            thinkingLevel: level,
          },
        },
      });
      const duration = Date.now() - startTime;
      this.logger.log(`[GeminiClient] API response received in ${duration}ms.`);

      const text = response.text || "";
      if (!text) {
        this.logger.warn("[GeminiClient] API returned empty response.");
      } else {
        this.logger.log(`[GeminiClient] Received response text (${text.length} characters).`);
      }

      return this.cleanMarkdownResponse(text);
    } catch (error) {
      this.logger.error(`[GeminiClient] API error: ${error}`);
      throw new Error(`Gemini API error: ${error}`);
    }
  }

  private mapThinkingLevel(level: string): ThinkingLevel {
    switch (level) {
      case "minimal":
      case "low":
        return ThinkingLevel.LOW;
      case "medium":
        return ThinkingLevel.MEDIUM;
      case "high":
      default:
        return ThinkingLevel.HIGH;
    }
  }

  private cleanMarkdownResponse(text: string): string {
    // Remove markdown code block wrappers if present
    const markdownRegex = /^```markdown\s*\n([\s\S]*?)\n```$/;
    const match = text.match(markdownRegex);
    if (match) {
      return match[1];
    }
    return text;
  }
}
