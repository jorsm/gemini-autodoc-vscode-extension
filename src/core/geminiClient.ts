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
      if (this.config.googleCloudProjectId) {
        // Use Vertex AI with ADC
        this.client = new GoogleGenAI({
          vertexai: true,
          project: this.config.googleCloudProjectId,
          location: this.config.googleCloudRegion,
        });
      } else {
        // Use API key mode
        const key = this.config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!key) {
          throw new Error("Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable, or configure in VS Code settings.");
        }
        this.client = new GoogleGenAI({ apiKey: key });
      }
    }
  }

  async generateDocumentation(prompt: string, systemInstruction?: string, thinkingLevel: string = "high"): Promise<string> {
    await this.initializeClient();

    let fullPrompt = prompt;
    if (systemInstruction) {
      fullPrompt = `${systemInstruction}\n\n${prompt}`;
    }

    try {
      const response = await this.client!.models.generateContent({
        model: this.config.model,
        contents: fullPrompt,
        config: {
          thinkingConfig: {
            thinkingLevel: this.mapThinkingLevel(thinkingLevel),
          },
        },
      });
      return this.cleanMarkdownResponse(response.text || "");
    } catch (error) {
      this.logger.error(`Gemini API error: ${error}`);
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
