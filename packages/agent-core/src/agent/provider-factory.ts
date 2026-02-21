/**
 * Creates AI SDK LanguageModel instances for various providers.
 * Uses OpenAI-compatible base URL for providers that support it.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModelV1 } from '@ai-sdk/provider';

export interface ProviderFactoryOptions {
  provider: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Strips provider prefix from model ID (e.g. "ollama/llama3.2" -> "llama3.2").
 */
function stripProviderPrefix(modelId: string, provider: string): string {
  const prefix = `${provider}/`;
  return modelId.startsWith(prefix) ? modelId.slice(prefix.length) : modelId;
}

/**
 * Creates an AI SDK LanguageModel for the given provider and model.
 * Returns null if the provider is not supported.
 */
export function createModel(options: ProviderFactoryOptions): LanguageModelV1 | null {
  const { provider, modelId, apiKey, baseUrl } = options;
  const model = stripProviderPrefix(modelId, provider);

  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        baseURL: baseUrl,
      });
      return openai(model);
    }

    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(model);
    }

    case 'google': {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(model);
    }

    case 'groq':
      return createOpenAI({
        apiKey: apiKey || process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      })(model);

    case 'deepseek':
      return createOpenAI({
        apiKey: apiKey || process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
      })(model);

    case 'xai':
      return createOpenAI({
        apiKey: apiKey || process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
      })(model);

    case 'moonshot':
      return createOpenAI({
        apiKey: apiKey || process.env.MOONSHOT_API_KEY,
        baseURL: 'https://api.moonshot.cn/v1',
      })(model);

    case 'openrouter':
      return createOpenAI({
        apiKey: apiKey || process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      })(modelId);

    case 'ollama':
      return createOpenAI({
        baseURL: (baseUrl || 'http://localhost:11434').replace(/\/$/, '') + '/v1',
      })(model);

    case 'lmstudio':
      return createOpenAI({
        baseURL: (baseUrl || 'http://localhost:1234').replace(/\/$/, '') + '/v1',
      })(model);

    case 'litellm': {
      const litellmBase = (baseUrl || 'http://localhost:4000').replace(/\/$/, '');
      return createOpenAI({
        apiKey: apiKey || 'not-needed',
        baseURL: `${litellmBase}/v1`,
      })(model);
    }

    case 'minimax':
      return createOpenAI({
        apiKey: apiKey || process.env.MINIMAX_API_KEY,
        baseURL: 'https://api.minimax.chat/v1',
      })(model);

    case 'zai':
    case 'zai-coding-plan':
      return createOpenAI({
        apiKey: apiKey || process.env.ZAI_API_KEY,
        baseURL: 'https://api.z.ai/v1',
      })(model);

    case 'azure-foundry':
      if (baseUrl && apiKey) {
        return createOpenAI({
          apiKey,
          baseURL: baseUrl.replace(/\/$/, ''),
        })(model);
      }
      return null;

    default:
      return null;
  }
}
