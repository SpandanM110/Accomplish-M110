/**
 * AI SDK-based agent adapter. Replaces OpenCode CLI with in-process
 * Vercel AI SDK for faster startup and lighter footprint.
 */

import { EventEmitter } from 'events';
import { streamText } from 'ai';
import { createModel } from './provider-factory.js';
import { createMcpClientsAndTools } from './mcp-manager.js';
import {
  CompletionEnforcer,
  type CompletionEnforcerCallbacks,
} from '../opencode/completion/index.js';
import type { TaskConfig, Task, TaskMessage, TaskResult } from '../common/types/task.js';
import type { OpenCodeMessage } from '../common/types/opencode.js';
import type { PermissionRequest } from '../common/types/permission.js';
import type { TodoItem } from '../common/types/todo.js';
import { createMessageId } from '../common/utils/id.js';
import { sanitizeAssistantTextForDisplay } from '../opencode/message-processor.js';
import type { AgentConfig } from './agent-config.js';

export type { AgentConfig } from './agent-config.js';

export interface AgentAdapterOptions {
  platform: NodeJS.Platform;
  isPackaged: boolean;
  tempPath: string;
  getAgentConfig: (config: TaskConfig, taskId: string) => Promise<AgentConfig>;
  onBeforeStart?: () => Promise<void>;
  getModelDisplayName?: (modelId: string) => string;
}

export interface AgentAdapterEvents {
  message: [OpenCodeMessage];
  'tool-use': [string, unknown];
  'tool-result': [string];
  'permission-request': [PermissionRequest];
  progress: [{ stage: string; message?: string; modelName?: string }];
  complete: [TaskResult];
  error: [Error];
  debug: [{ type: string; message: string; data?: unknown }];
  'todo:update': [TodoItem[]];
  'auth-error': [{ providerId: string; message: string }];
  reasoning: [string];
  'tool-call-complete': [
    {
      toolName: string;
      toolInput: unknown;
      toolOutput: string;
      sessionId?: string;
    },
  ];
  'step-finish': [
    {
      reason: string;
      model?: string;
      tokens?: {
        input: number;
        output: number;
        reasoning: number;
        cache?: { read: number; write: number };
      };
      cost?: number;
    },
  ];
}

const MAX_STEPS = 20;
const SESSION_ID_PREFIX = 'ai-sdk-';

export class AgentAdapter extends EventEmitter<AgentAdapterEvents> {
  private options: AgentAdapterOptions;
  private taskId: string | null = null;
  private sessionId: string | null = null;
  private modelId: string | null = null;
  private hasCompleted = false;
  private isDisposed = false;
  private abortController: AbortController | null = null;
  private mcpClients: Array<{ close: () => Promise<void> }> = [];
  private completionEnforcer: CompletionEnforcer;
  private startTaskCalled = false;
  private messages: TaskMessage[] = [];

  constructor(options: AgentAdapterOptions, taskId?: string) {
    super();
    this.options = options;
    this.taskId = taskId || null;
    this.completionEnforcer = this.createCompletionEnforcer();
  }

  private createCompletionEnforcer(): CompletionEnforcer {
    const callbacks: CompletionEnforcerCallbacks = {
      onStartContinuation: async (prompt: string) => {
        await this.runContinuation(prompt);
      },
      onComplete: () => {
        this.hasCompleted = true;
        this.emit('complete', {
          status: 'success',
          sessionId: this.sessionId || undefined,
        });
      },
      onDebug: (type: string, message: string, data?: unknown) => {
        this.emit('debug', { type, message, data });
      },
    };
    return new CompletionEnforcer(callbacks);
  }

  async startTask(config: TaskConfig): Promise<Task> {
    if (this.isDisposed) {
      throw new Error('Adapter has been disposed and cannot start new tasks');
    }

    this.taskId = config.taskId || this.generateTaskId();
    this.sessionId = `${SESSION_ID_PREFIX}${Date.now()}`;
    this.modelId = config.modelId || null;
    this.messages = [];
    this.hasCompleted = false;
    this.startTaskCalled = false;
    this.completionEnforcer.reset();
    this.abortController = new AbortController();

    if (this.options.onBeforeStart) {
      await this.options.onBeforeStart();
    }

    const agentConfig = await this.options.getAgentConfig(config, this.taskId);
    const model = createModel({
      provider: agentConfig.provider,
      modelId: agentConfig.modelId,
      apiKey: agentConfig.apiKey,
      baseUrl: agentConfig.baseUrl,
    });

    if (!model) {
      throw new Error(
        `Unsupported provider: ${agentConfig.provider}. Supported: openai, anthropic, google, groq, deepseek, ollama, openrouter, lmstudio, etc.`,
      );
    }

    const modelDisplayName =
      this.modelId && this.options.getModelDisplayName
        ? this.options.getModelDisplayName(this.modelId)
        : 'AI';

    this.emit('progress', {
      stage: 'loading',
      message: `Connecting to ${modelDisplayName}...`,
      modelName: modelDisplayName,
    });

    try {
      const { tools, clients } = await createMcpClientsAndTools(agentConfig.mcpServerSpecs);
      this.mcpClients = clients;

      this.emit('progress', {
        stage: 'connecting',
        message: `Running with ${modelDisplayName}...`,
        modelName: modelDisplayName,
      });

      // Direct bypass for hackathon search — skip LLM when model struggles with tools
      if (await this.tryDirectHackathonSearch(config.prompt, tools)) {
        return {
          id: this.taskId,
          prompt: config.prompt,
          status: 'running',
          messages: this.messages,
          createdAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
        };
      }

      await this.runAgentLoop(
        config.prompt,
        agentConfig.systemPrompt,
        model,
        tools,
        agentConfig.provider,
      );
    } catch (err) {
      if (!this.hasCompleted) {
        this.hasCompleted = true;
        const error = err instanceof Error ? err : new Error(String(err));
        this.emit('error', error);
        this.emit('complete', {
          status: 'error',
          sessionId: this.sessionId || undefined,
          error: error.message,
        });
      }
    } finally {
      await this.closeMcpClients();
    }

    return {
      id: this.taskId,
      prompt: config.prompt,
      status: 'running',
      messages: this.messages,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };
  }

  /**
   * Direct bypass for hackathon search prompts. Skips the LLM entirely.
   * Just: execute search tool → emit result → complete. No start_task, no complete_task, no side effects.
   */
  private async tryDirectHackathonSearch(
    prompt: string,
    tools: Record<string, unknown>,
  ): Promise<boolean> {
    const searchTool = 'hb_scout_search_hackathons' in tools ? 'hb_scout_search_hackathons' : null;
    if (!searchTool) return false;

    const lower = (prompt ?? '').trim().toLowerCase();
    if (
      !lower.includes('/hackathon-buddy') &&
      !(lower.includes('hackathon') && (lower.includes('search') || lower.includes('find')))
    ) {
      return false;
    }

    let query = 'hackathons';
    const match = prompt.match(/(?:hackathon-buddy\s+)?(?:search\s+for\s+|find\s+)(.+)/i);
    if (match?.[1]) query = match[1].trim();

    this.emit('progress', { stage: 'tool-use', message: 'Searching hackathons...' });

    try {
      const tool = tools[searchTool] as { execute?: (args: unknown) => Promise<unknown> };
      if (typeof tool?.execute !== 'function') return false;

      const result = await tool.execute({ query, platform: 'all', response_format: 'markdown' });
      // MCP tools return { content: [{ type: 'text', text: '...' }] } — extract the text
      let searchResult: string;
      if (typeof result === 'string') {
        searchResult = result;
      } else if (
        result &&
        typeof result === 'object' &&
        Array.isArray((result as { content?: unknown[] }).content)
      ) {
        const content = (result as { content: Array<{ type?: string; text?: string }> }).content;
        const textBlock = content.find((c) => c.type === 'text');
        searchResult = textBlock?.text ?? JSON.stringify(result);
      } else {
        searchResult = JSON.stringify(result ?? '');
      }

      const msg: TaskMessage = {
        id: createMessageId(),
        type: 'assistant',
        content: searchResult,
        timestamp: new Date().toISOString(),
      };
      this.messages.push(msg);
      this.emit('message', {
        type: 'text',
        part: {
          id: msg.id,
          sessionID: this.sessionId || '',
          messageID: msg.id,
          type: 'text',
          text: searchResult,
        },
      } as OpenCodeMessage);

      this.hasCompleted = true;
      this.emit('complete', { status: 'success', sessionId: this.sessionId || undefined });
      return true;
    } catch (err) {
      console.warn('[AgentAdapter] Direct hackathon search failed:', err);
      return false;
    }
  }

  private async runAgentLoop(
    userPrompt: string,
    systemPrompt: string,
    model: Parameters<typeof streamText>[0]['model'],
    tools: Parameters<typeof streamText>[0]['tools'],
    provider?: string,
  ): Promise<void> {
    const toolsRecord = tools as Record<string, unknown>;
    const toolCount = Object.keys(toolsRecord).length;
    // Force tool use on first turn — small models (Groq 8B, Ollama 3b, etc.) often return empty with 'auto'
    // Use explicit start_task for ALL providers; 'required' is rejected by Groq and some others
    let toolChoice: 'auto' | 'required' | { type: 'tool'; toolName: string } = 'auto';
    if (toolCount > 0) {
      const firstTool =
        'start_task' in toolsRecord
          ? 'start_task'
          : (Object.keys(toolsRecord).find((k) => k.endsWith('_start_task')) ?? null);
      if (firstTool) {
        toolChoice = { type: 'tool', toolName: firstTool };
      } else {
        toolChoice = provider === 'groq' ? 'auto' : 'required';
      }
    }
    this.emit('debug', {
      type: 'stream',
      message: `toolChoice: ${JSON.stringify(toolChoice)}, toolCount: ${toolCount}`,
    });

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      maxSteps: MAX_STEPS,
      maxTokens: 4096,
      abortSignal: this.abortController?.signal,
      toolChoice,
      onFinish: ({ finishReason }) => {
        this.emit('step-finish', {
          reason:
            finishReason === 'stop'
              ? 'stop'
              : finishReason === 'tool-calls'
                ? 'tool_use'
                : 'end_turn',
        });
      },
    });

    let fullText = '';
    let lastFinishReason: string = 'stop';
    let streamingMsgId: string | null = null;
    let lastEmitTime = 0;
    let partCount = 0;
    let toolCallsReceived = 0;
    const EMIT_THROTTLE_MS = 80;

    function getFinishReason(part: unknown): string | undefined {
      const p = part as { finishReason?: string; response?: { finishReason?: string } };
      return p.finishReason ?? p.response?.finishReason;
    }

    // Use fullStream for incremental processing — avoids "stuck" waiting for full stream
    for await (const part of result.fullStream) {
      partCount++;
      const p = part as {
        type?: string;
        textDelta?: string;
        toolName?: string;
        args?: unknown;
        result?: unknown;
      };
      if (partCount <= 3 || partCount % 20 === 0) {
        this.emit('debug', {
          type: 'stream',
          message: `Part #${partCount}: ${p.type}`,
          data: { type: p.type, hasText: !!p.textDelta, toolName: p.toolName },
        });
      }
      if (p.type === 'text-delta' && p.textDelta) {
        fullText += p.textDelta;
        const display = sanitizeAssistantTextForDisplay(fullText) ?? fullText;
        if (display) {
          const now = Date.now();
          const shouldEmit = !streamingMsgId || now - lastEmitTime >= EMIT_THROTTLE_MS;
          if (!streamingMsgId) {
            streamingMsgId = createMessageId();
          }
          if (shouldEmit) {
            lastEmitTime = now;
            const msg: TaskMessage = {
              id: streamingMsgId,
              type: 'assistant',
              content: display,
              timestamp: new Date().toISOString(),
            };
            const lastIdx = this.messages.findIndex((m) => m.id === streamingMsgId);
            if (lastIdx >= 0) {
              this.messages[lastIdx] = msg;
            } else {
              this.messages.push(msg);
            }
            this.emit('message', {
              type: 'text',
              part: {
                id: msg.id,
                sessionID: this.sessionId || '',
                messageID: msg.id,
                type: 'text',
                text: display,
              },
            } as OpenCodeMessage);
            this.emit('reasoning', display);
          }
        }
      } else if (p.type === 'reasoning' && (p as { textDelta?: string }).textDelta) {
        const r = part as { textDelta?: string };
        if (r.textDelta) this.emit('reasoning', r.textDelta);
      } else if (p.type === 'tool-call' && p.toolName) {
        toolCallsReceived++;
        streamingMsgId = null;
        this.handleToolCall(p.toolName, p.args ?? {});
      } else if (p.type === 'tool-result') {
        const tr = part as { toolName?: string; args?: unknown; result?: unknown };
        if (tr.toolName) {
          const output =
            typeof tr.result === 'string'
              ? tr.result
              : ((tr.result as { result?: unknown })?.result ?? String(tr.result ?? ''));
          this.handleToolResult(tr.toolName, tr.args ?? {}, output);
        }
      } else if (p.type === 'step-finish') {
        if (fullText && streamingMsgId) {
          const display = sanitizeAssistantTextForDisplay(fullText) ?? fullText;
          const msg: TaskMessage = {
            id: streamingMsgId,
            type: 'assistant',
            content: display,
            timestamp: new Date().toISOString(),
          };
          const lastIdx = this.messages.findIndex((m) => m.id === streamingMsgId);
          if (lastIdx >= 0) this.messages[lastIdx] = msg;
          else this.messages.push(msg);
          this.emit('message', {
            type: 'text',
            part: {
              id: msg.id,
              sessionID: this.sessionId || '',
              messageID: msg.id,
              type: 'text',
              text: display,
            },
          } as OpenCodeMessage);
        }
        streamingMsgId = null;
        const reason = getFinishReason(part);
        if (reason) lastFinishReason = reason;
      } else if (p.type === 'finish') {
        if (fullText && streamingMsgId) {
          const display = sanitizeAssistantTextForDisplay(fullText) ?? fullText;
          const msg: TaskMessage = {
            id: streamingMsgId,
            type: 'assistant',
            content: display,
            timestamp: new Date().toISOString(),
          };
          const lastIdx = this.messages.findIndex((m) => m.id === streamingMsgId);
          if (lastIdx >= 0) this.messages[lastIdx] = msg;
          else this.messages.push(msg);
          this.emit('message', {
            type: 'text',
            part: {
              id: msg.id,
              sessionID: this.sessionId || '',
              messageID: msg.id,
              type: 'text',
              text: display,
            },
          } as OpenCodeMessage);
        }
        streamingMsgId = null;
        lastFinishReason = getFinishReason(part) ?? lastFinishReason;
      }
    }

    const hadToolCalls = toolCallsReceived > 0;
    console.log(
      `[AgentAdapter] Stream ended. Parts: ${partCount}, finishReason: ${lastFinishReason}, textLength: ${fullText.length}, hadToolCalls: ${hadToolCalls}`,
    );

    if (fullText.length === 0 && !hadToolCalls && toolCount > 0) {
      const fallbackMsg =
        'The model returned no output. Try a larger model in Settings (e.g. Groq llama-3.1-70b-versatile, Ollama llama3.2:3b, or Claude). Small models often struggle with many tools. For hackathon search, the direct path should have been used — if you see this, please report the prompt.';
      const msg: TaskMessage = {
        id: createMessageId(),
        type: 'assistant',
        content: fallbackMsg,
        timestamp: new Date().toISOString(),
      };
      this.messages.push(msg);
      this.emit('message', {
        type: 'text',
        part: {
          id: msg.id,
          sessionID: this.sessionId || '',
          messageID: msg.id,
          type: 'text',
          text: fallbackMsg,
        },
      } as OpenCodeMessage);
    }

    const finishReason = lastFinishReason;
    const action = this.completionEnforcer.handleStepFinish(
      finishReason === 'stop' ? 'stop' : finishReason === 'tool-calls' ? 'tool_use' : 'end_turn',
    );

    if (action === 'complete') {
      this.hasCompleted = true;
      this.emit('complete', {
        status: 'success',
        sessionId: this.sessionId || undefined,
      });
      return;
    }

    if (action === 'pending') {
      await this.completionEnforcer.handleProcessExit(0);
      return;
    }

    if (!this.hasCompleted) {
      this.hasCompleted = true;
      this.emit('complete', {
        status: 'success',
        sessionId: this.sessionId || undefined,
      });
    }
  }

  private async runContinuation(prompt: string): Promise<void> {
    const agentConfig = await this.options.getAgentConfig(
      { prompt, sessionId: this.sessionId || undefined } as TaskConfig,
      this.taskId || 'default',
    );
    const model = createModel({
      provider: agentConfig.provider,
      modelId: agentConfig.modelId,
      apiKey: agentConfig.apiKey,
      baseUrl: agentConfig.baseUrl,
    });
    if (!model) return;

    const { tools, clients } = await createMcpClientsAndTools(agentConfig.mcpServerSpecs);
    this.mcpClients = clients;

    await this.runAgentLoop(prompt, agentConfig.systemPrompt, model, tools, agentConfig.provider);
  }

  private handleToolCall(toolName: string, toolInput: unknown): void {
    if (toolName === 'start_task' || toolName.endsWith('_start_task')) {
      this.startTaskCalled = true;
      const input = toolInput as {
        needs_planning?: boolean;
        goal?: string;
        steps?: string[];
        verification?: string[];
        skills?: string[];
      };
      if (input?.needs_planning && input?.goal && input?.steps) {
        this.completionEnforcer.markTaskRequiresCompletion();
        const todos: TodoItem[] = input.steps.map((step, i) => ({
          id: String(i + 1),
          content: step,
          status: (i === 0 ? 'in_progress' : 'pending') as TodoItem['status'],
          priority: 'medium' as TodoItem['priority'],
        }));
        this.emit('todo:update', todos);
        this.completionEnforcer.updateTodos(todos);
      }
    }

    if (!this.startTaskCalled && !this.isExemptTool(toolName)) {
      this.emit('debug', {
        type: 'warning',
        message: `Tool "${toolName}" called before start_task`,
      });
    }

    this.completionEnforcer.markToolsUsed(!this.isNonTaskContinuationTool(toolName));

    if (toolName === 'complete_task' || toolName.endsWith('_complete_task')) {
      this.completionEnforcer.handleCompleteTaskDetection(toolInput);
    }

    if (toolName === 'todowrite' || toolName.endsWith('_todowrite')) {
      const input = toolInput as { todos?: Array<Partial<TodoItem> & { content: string }> };
      if (input?.todos && Array.isArray(input.todos) && input.todos.length > 0) {
        const todos: TodoItem[] = input.todos.map((t) => ({
          id: t.id || crypto.randomUUID(),
          content: t.content,
          status: (t.status as TodoItem['status']) || 'pending',
          priority: (t.priority as TodoItem['priority']) || 'medium',
        }));
        this.emit('todo:update', todos);
        this.completionEnforcer.updateTodos(todos);
      }
    }

    this.emit('tool-use', toolName, toolInput);
    this.emit('progress', { stage: 'tool-use', message: `Using ${toolName}` });
  }

  private handleToolResult(toolName: string, toolInput: unknown, output: unknown): void {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output ?? '');
    this.emit('tool-result', outputStr);
    this.emit('tool-call-complete', {
      toolName,
      toolInput,
      toolOutput: outputStr,
      sessionId: this.sessionId || undefined,
    });
  }

  private isExemptTool(toolName: string): boolean {
    return (
      toolName === 'todowrite' ||
      toolName.endsWith('_todowrite') ||
      toolName === 'start_task' ||
      toolName.endsWith('_start_task')
    );
  }

  private isNonTaskContinuationTool(toolName: string): boolean {
    const exempt = [
      'discard',
      'todowrite',
      'complete_task',
      'AskUserQuestion',
      'report_checkpoint',
      'report_thought',
      'request_file_permission',
    ];
    return (
      toolName === 'skill' ||
      toolName.endsWith('_skill') ||
      toolName === 'start_task' ||
      toolName.endsWith('_start_task') ||
      exempt.some((t) => toolName === t || toolName.endsWith(`_${t}`))
    );
  }

  private async closeMcpClients(): Promise<void> {
    for (const client of this.mcpClients) {
      try {
        await client.close();
      } catch (err) {
        console.warn('[AgentAdapter] Error closing MCP client:', err);
      }
    }
    this.mcpClients = [];
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async resumeSession(sessionId: string, prompt: string): Promise<Task> {
    return this.startTask({
      prompt,
      sessionId,
    } as TaskConfig);
  }

  async sendResponse(_response: string): Promise<void> {
    // Permission/question responses are handled via HTTP API, not through adapter
  }

  async cancelTask(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (!this.hasCompleted) {
      this.hasCompleted = true;
      this.emit('complete', {
        status: 'interrupted',
        sessionId: this.sessionId || undefined,
      });
    }
  }

  async interruptTask(): Promise<void> {
    await this.cancelTask();
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getTaskId(): string | null {
    return this.taskId;
  }

  get running(): boolean {
    return !this.hasCompleted && this.abortController !== null;
  }

  isAdapterDisposed(): boolean {
    return this.isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    void this.closeMcpClients();
    this.removeAllListeners();
  }
}
