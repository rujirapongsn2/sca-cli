export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelConfig {
  endpoint: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ProviderHealth {
  available: boolean;
  latency?: number;
  error?: string;
  model?: string;
}

export abstract class ModelProvider {
  protected config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  abstract chat(messages: Message[], options?: Partial<ModelConfig>): Promise<ChatCompletion>;

  abstract healthCheck(): Promise<ProviderHealth>;

  abstract close(): void;
}

export function createProvider(provider: string, config: ModelConfig): ModelProvider {
  switch (provider) {
    case 'local':
      return new LocalLLMProvider(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

class LocalLLMProvider extends ModelProvider {
  async chat(messages: Message[], _options?: Partial<ModelConfig>): Promise<ChatCompletion> {
    const response = await fetch(`${this.config.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        options: {
          temperature: this.config.temperature ?? 0.7,
          num_predict: this.config.maxTokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      id: `chat-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: this.config.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              ((data.message as Record<string, unknown>)?.content as string) ??
              (data.response as string) ??
              '',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: (data.eval_count as number) ?? 0,
        completion_tokens: (data.prompt_eval_count as number) ?? 0,
        total_tokens:
          ((data.eval_count as number) ?? 0) + ((data.prompt_eval_count as number) ?? 0),
      },
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.config.endpoint}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        return { available: false, error: response.statusText, latency: Date.now() - start };
      }

      return {
        available: true,
        latency: Date.now() - start,
        model: this.config.model,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
      };
    }
  }

  close(): void {}
}
