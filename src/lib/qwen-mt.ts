import OpenAI from "openai";

export interface TranslationOptions {
  source_lang: string;
  target_lang: string;
  terms?: { source: string; target: string }[];
  tm_list?: { source: string; target: string }[];
  domains?: string;
}

export interface QwenMTConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export class QwenMTService {
  private client: OpenAI | null = null;
  private config: QwenMTConfig;

  constructor(config: QwenMTConfig) {
    this.config = config;
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        dangerouslyAllowBrowser: true,
      });
    }
  }

  async translate(text: string, options: TranslationOptions) {
    if (!this.client) {
      throw new Error("API Key not configured");
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: "user", content: text }],
        // @ts-ignore - Qwen-MT specific parameter
        translation_options: {
          source_lang: options.source_lang,
          target_lang: options.target_lang,
          terms: options.terms,
          tm_list: options.tm_list,
          domains: options.domains,
        },
      });

      return {
        translatedText: completion.choices[0].message.content,
        usage: completion.usage,
      };
    } catch (error: any) {
      console.error("Qwen-MT Translation Error:", error);
      throw error;
    }
  }
}
