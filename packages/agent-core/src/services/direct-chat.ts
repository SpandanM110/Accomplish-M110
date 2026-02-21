/**
 * Direct LLM chat for simple prompts - bypasses OpenCode CLI for faster, more reliable responses.
 * Uses native fetch to call OpenAI-compatible APIs (Ollama, Groq, etc.).
 */

import type { TaskMessage } from '../common/types/task.js';
import { createMessageId } from '../common/utils/id.js';
import { sanitizeAssistantTextForDisplay } from '../opencode/message-processor.js';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export interface DirectChatConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  /** Provider ID for logging */
  providerId?: string;
}

export interface DirectChatCallbacks {
  onProgress?: (stage: string, message?: string) => void;
  onMessage?: (message: TaskMessage) => void;
  onComplete?: (text: string) => void;
  onError?: (error: Error) => void;
}

/** Conversation history for multi-turn chat. */
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Resolves base URL and model for a provider.
 * Returns null if the provider doesn't support direct chat.
 */
export function getDirectChatConfig(
  provider: string,
  modelId: string,
  baseUrl?: string,
  apiKey?: string,
): DirectChatConfig | null {
  const model = modelId.replace(/^[^/]+\//, ''); // Strip provider prefix e.g. "ollama/llama3.2" -> "llama3.2"

  switch (provider) {
    case 'ollama':
      return {
        baseUrl: (baseUrl || 'http://localhost:11434').replace(/\/$/, '') + '/v1',
        apiKey: undefined,
        model,
        providerId: 'ollama',
      };
    case 'groq':
      return {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: apiKey || undefined,
        model,
        providerId: 'groq',
      };
    case 'openai':
      return {
        baseUrl: baseUrl || 'https://api.openai.com/v1',
        apiKey: apiKey || undefined,
        model,
        providerId: 'openai',
      };
    case 'openrouter':
      return {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: apiKey || undefined,
        model,
        providerId: 'openrouter',
      };
    case 'deepseek':
      return {
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: apiKey || undefined,
        model,
        providerId: 'deepseek',
      };
    case 'lmstudio':
      return {
        baseUrl: (baseUrl || 'http://localhost:1234').replace(/\/$/, '') + '/v1',
        apiKey: undefined,
        model,
        providerId: 'lmstudio',
      };
    default:
      return null;
  }
}

const DIRECT_SESSION_PREFIX = 'direct-';

/** Returns true if the sessionId indicates a direct chat session (allows continued conversation). */
export function isDirectChatSession(sessionId: string): boolean {
  return sessionId.startsWith(DIRECT_SESSION_PREFIX);
}

/**
 * Runs a simple chat completion directly against an OpenAI-compatible API.
 * Bypasses OpenCode for fast, reliable responses to short prompts.
 * Supports multi-turn via conversationHistory for continued chat.
 */
export async function runDirectChat(
  prompt: string,
  config: DirectChatConfig,
  callbacks: DirectChatCallbacks,
  options?: { conversationHistory?: ConversationTurn[] },
): Promise<string> {
  const { onProgress, onMessage, onComplete, onError } = callbacks;

  onProgress?.('direct-chat', 'Connecting...');

  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const history = options?.conversationHistory ?? [];
  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'system',
      content: `You are Accomplish M110, a helpful assistant. Respond briefly and naturally. For greetings or simple questions, give a short, friendly reply in 1-2 sentences. Never output JSON, schemas, or code examples.`,
    },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: prompt },
  ];

  const body = {
    model: config.model,
    messages,
    max_tokens: 256,
  };

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      onProgress?.(
        'direct-chat',
        attempt > 1 ? `Retrying (${attempt}/${MAX_RETRIES})...` : 'Generating response...',
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const status = response.status;
        const text = await response.text();
        let errMsg = `API error ${status}`;
        try {
          const json = JSON.parse(text);
          errMsg = (json as { error?: { message?: string } })?.error?.message ?? errMsg;
        } catch {
          if (text.length < 200) errMsg = text;
        }
        throw new Error(errMsg);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text =
        data?.choices?.[0]?.message?.content?.trim() ?? '';

      if (text) {
        const displayText = sanitizeAssistantTextForDisplay(text) ?? text;
        const assistantMessage: TaskMessage = {
          id: createMessageId(),
          type: 'assistant',
          content: displayText.trim(),
          timestamp: new Date().toISOString(),
        };
        onMessage?.(assistantMessage);
      }

      onComplete?.(text);
      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const is429 =
        (lastError as Error & { status?: number }).status === 429 ||
        lastError.message?.includes('429') ||
        lastError.message?.toLowerCase().includes('rate limit');

      if (is429 && attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[DirectChat] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        break;
      }
    }
  }

  const error = lastError ?? new Error('Direct chat failed');
  onError?.(error);
  throw error;
}
