import { app } from 'electron';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { TaskManagerOptions, TaskCallbacks } from '@accomplish_ai/agent-core';
import type { TaskConfig } from '@accomplish_ai/agent-core';
import { DEV_BROWSER_PORT } from '@accomplish_ai/agent-core';
import {
  getAzureEntraToken,
  resolveCliPath,
  isCliAvailable as coreIsCliAvailable,
  buildCliArgs as coreBuildCliArgs,
  buildOpenCodeEnvironment,
  type BrowserServerConfig,
  type CliResolverConfig,
  type EnvironmentConfig,
} from '@accomplish_ai/agent-core';
import { startEmbeddedBrowserApi } from '../embedded-browser-api';
import { getModelDisplayName } from '@accomplish_ai/agent-core';
import type {
  AzureFoundryCredentials,
  BedrockCredentials,
  VertexCredentials,
} from '@accomplish_ai/agent-core';
import { getStorage } from '../store/storage';
import { getAllApiKeys, getBedrockCredentials, getApiKey } from '../store/secureStorage';
import {
  generateOpenCodeConfig,
  getMcpToolsPath,
  syncApiKeysToOpenCodeAuth,
  getAgentConfigForTask,
} from './config-generator';
import type { BrowserConfig } from '@accomplish_ai/agent-core';

/** Browser mode for the current task. Set by onBeforeTaskStart, read by onBeforeStart. */
let currentTaskBrowserOverride: BrowserConfig | undefined = undefined;

/** When true, load only start-task, complete-task, hackathon-buddy (reduces tool count for hackathon prompts). */
let currentTaskHackathonOnly = false;

/** Browser server promise started in onBeforeTaskStart, awaited in onBeforeStart. */
let pendingBrowserPromise: Promise<{ ready: boolean; logs: string[] }> | null = null;

import { getExtendedNodePath } from '../utils/system-path';
import { getBundledNodePaths, logBundledNodeInfo } from '../utils/bundled-node';

/** Provider-aware concurrency: Groq free tier has strict TPM limits, so limit to 1 task at a time. */
function getProviderAwareMaxConcurrent(): number {
  try {
    const storage = getStorage();
    const activeModel = storage.getActiveProviderModel();
    const provider = activeModel?.provider;
    if (provider === 'groq') return 1;
    if (provider === 'deepseek' || provider === 'moonshot') return 2;
    return 5;
  } catch {
    return 5;
  }
}

const VERTEX_SA_KEY_FILENAME = 'vertex-sa-key.json';

/**
 * Removes the Vertex AI service account key file from disk if it exists.
 * Called when the Vertex provider is disconnected or the app quits.
 */
export function cleanupVertexServiceAccountKey(): void {
  try {
    const keyPath = path.join(app.getPath('userData'), VERTEX_SA_KEY_FILENAME);
    if (fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
      console.log('[Vertex] Cleaned up service account key file');
    }
  } catch (error) {
    console.warn('[Vertex] Failed to clean up service account key file:', error);
  }
}

function getCliResolverConfig(): CliResolverConfig {
  return {
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appPath: app.getAppPath(),
  };
}

export function getOpenCodeCliPath(): { command: string; args: string[] } {
  const resolved = resolveCliPath(getCliResolverConfig());
  if (resolved) {
    return { command: resolved.cliPath, args: [] };
  }
  throw new Error(
    '[CLI Path] OpenCode CLI executable not found. Reinstall dependencies to restore platform binaries.',
  );
}

export function isOpenCodeBundled(): boolean {
  return coreIsCliAvailable(getCliResolverConfig());
}

export function getBundledOpenCodeVersion(): string | null {
  if (app.isPackaged) {
    try {
      const packageName = process.platform === 'win32' ? 'opencode-windows-x64' : 'opencode-ai';
      const packageJsonPath = path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        packageName,
        'package.json',
      );

      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return pkg.version;
      }
    } catch {
      // intentionally empty
    }
  }

  try {
    const { command } = getOpenCodeCliPath();
    const fullCommand = `"${command}" --version`;
    const output = execSync(fullCommand, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : output;
  } catch {
    return null;
  }
}

export async function buildEnvironment(taskId: string): Promise<NodeJS.ProcessEnv> {
  // Start with base environment
  let env: NodeJS.ProcessEnv = { ...process.env };

  // Handle Electron-specific environment setup for packaged app
  if (app.isPackaged) {
    env.ELECTRON_RUN_AS_NODE = '1';

    logBundledNodeInfo();

    const bundledNode = getBundledNodePaths();
    if (bundledNode) {
      const delimiter = process.platform === 'win32' ? ';' : ':';
      const existingPath = env.PATH ?? env.Path ?? '';
      const combinedPath = existingPath
        ? `${bundledNode.binDir}${delimiter}${existingPath}`
        : bundledNode.binDir;
      env.PATH = combinedPath;
      if (process.platform === 'win32') {
        env.Path = combinedPath;
      }
      console.log('[OpenCode CLI] Added bundled Node.js to PATH:', bundledNode.binDir);
    }

    if (process.platform === 'darwin') {
      env.PATH = getExtendedNodePath(env.PATH);
    }
  }

  // Gather configuration for the reusable environment builder
  const apiKeys = await getAllApiKeys();
  const bedrockCredentials = getBedrockCredentials() as BedrockCredentials | null;
  const bundledNode = getBundledNodePaths();

  // Determine OpenAI base URL
  const storage = getStorage();
  const configuredOpenAiBaseUrl = apiKeys.openai ? storage.getOpenAiBaseUrl().trim() : undefined;

  // Determine Ollama host
  const activeModel = storage.getActiveProviderModel();
  const selectedModel = storage.getSelectedModel();
  let ollamaHost: string | undefined;
  if (activeModel?.provider === 'ollama' && activeModel.baseUrl) {
    ollamaHost = activeModel.baseUrl;
  } else if (selectedModel?.provider === 'ollama' && selectedModel.baseUrl) {
    ollamaHost = selectedModel.baseUrl;
  }

  // Handle Vertex AI credentials
  let vertexCredentials: VertexCredentials | undefined;
  let vertexServiceAccountKeyPath: string | undefined;
  const vertexCredsJson = getApiKey('vertex');
  if (vertexCredsJson) {
    try {
      const parsed = JSON.parse(vertexCredsJson) as VertexCredentials;
      vertexCredentials = parsed;
      if (parsed.authType === 'serviceAccount' && parsed.serviceAccountJson) {
        const userDataPath = app.getPath('userData');
        vertexServiceAccountKeyPath = path.join(userDataPath, VERTEX_SA_KEY_FILENAME);
        fs.writeFileSync(vertexServiceAccountKeyPath, parsed.serviceAccountJson, { mode: 0o600 });
      }
    } catch {
      console.warn('[OpenCode CLI] Failed to parse Vertex credentials');
    }
  }

  // Build environment configuration
  const envConfig: EnvironmentConfig = {
    apiKeys,
    bedrockCredentials: bedrockCredentials || undefined,
    vertexCredentials,
    vertexServiceAccountKeyPath,
    bundledNodeBinPath: bundledNode?.binDir,
    taskId: taskId || undefined,
    openAiBaseUrl: configuredOpenAiBaseUrl || undefined,
    ollamaHost,
  };

  // Use the core function to set API keys and credentials
  env = buildOpenCodeEnvironment(env, envConfig);

  if (taskId) {
    console.log('[OpenCode CLI] Task ID in environment:', taskId);
  }

  return env;
}

export async function buildCliArgs(config: TaskConfig, _taskId: string): Promise<string[]> {
  const storage = getStorage();
  const activeModel = storage.getActiveProviderModel();
  const selectedModel = activeModel || storage.getSelectedModel();

  return coreBuildCliArgs({
    prompt: config.prompt,
    sessionId: config.sessionId,
    selectedModel: selectedModel
      ? {
          provider: selectedModel.provider,
          model: selectedModel.model,
        }
      : null,
  });
}

export function getCliCommand(): { command: string; args: string[] } {
  return getOpenCodeCliPath();
}

export async function isCliAvailable(): Promise<boolean> {
  return isOpenCodeBundled();
}

async function prepareConfig(): Promise<void> {
  await syncApiKeysToOpenCodeAuth();

  let azureFoundryToken: string | undefined;
  const storage = getStorage();
  const activeModel = storage.getActiveProviderModel();
  const selectedModel = activeModel || storage.getSelectedModel();
  const azureFoundryConfig = storage.getAzureFoundryConfig();
  const azureFoundryProvider = storage.getConnectedProvider('azure-foundry');
  const azureFoundryCredentials = azureFoundryProvider?.credentials as
    | AzureFoundryCredentials
    | undefined;

  const isAzureFoundryEntraId =
    (selectedModel?.provider === 'azure-foundry' &&
      azureFoundryCredentials?.authMethod === 'entra-id') ||
    (selectedModel?.provider === 'azure-foundry' && azureFoundryConfig?.authType === 'entra-id');

  if (isAzureFoundryEntraId) {
    const tokenResult = await getAzureEntraToken();
    if (!tokenResult.success) {
      throw new Error(tokenResult.error);
    }
    azureFoundryToken = tokenResult.token;
  }

  await generateOpenCodeConfig(
    azureFoundryToken,
    currentTaskBrowserOverride,
    currentTaskHackathonOnly,
  );
}

export async function onBeforeStart(): Promise<void> {
  const configPromise = prepareConfig();
  const browserPromise =
    pendingBrowserPromise ?? Promise.resolve({ ready: true, logs: [] as string[] });
  pendingBrowserPromise = null;

  await Promise.all([configPromise, browserPromise]);
}

function _getBrowserServerConfig(): BrowserServerConfig {
  const bundledPaths = getBundledNodePaths();
  return {
    mcpToolsPath: getMcpToolsPath(),
    bundledNodeBinPath: bundledPaths?.binDir,
    devBrowserPort: DEV_BROWSER_PORT,
  };
}

/** Keywords that suggest the user wants browser/web automation or Hackathon Buddy tools */
const BROWSER_KEYWORDS = [
  'search',
  'google',
  'browse',
  'open',
  'navigate',
  'website',
  'web',
  'url',
  'link',
  'fill form',
  'click',
  'scrape',
  'screenshot',
  'page',
  'browser',
  'chrome',
  'firefox',
  'look up',
  'find on',
  'check ',
  'visit',
  'go to',
  'fetch',
  'scraping',
  'hackathon',
  'validate',
  'validate my idea',
  'ticket board',
  'judge',
  'grants',
];

/**
 * Returns true if the prompt is a simple conversational message that doesn't need browser tools.
 * Examples: "Hi", "Hello", "Thanks", "What can you do?", "Help"
 */
export function isSimpleConversationalPrompt(prompt: string): boolean {
  const trimmed = (prompt ?? '').trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > 150) return false; // Longer messages likely have a real task

  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  // Check for browser-related keywords first - if found, never treat as simple
  if (BROWSER_KEYWORDS.some((kw) => lower.includes(kw))) {
    return false;
  }

  // Hard rule: very short prompts (< 30 chars) without browser keywords = simple
  if (trimmed.length < 30) return true;

  // Greetings and simple phrases (any length)
  const simplePhrases = [
    'hi',
    'hello',
    'hey',
    'hiya',
    'yo',
    'sup',
    'howdy',
    'hola',
    'greetings',
    'thanks',
    'thank you',
    'thx',
    'ty',
    'ok',
    'okay',
    'yes',
    'no',
    'yep',
    'nope',
    'help',
    'what can you do',
    'who are you',
    'what are you',
    'how are you',
    'good morning',
    'good afternoon',
    'good evening',
    'good night',
  ];
  if (
    simplePhrases.some((s) => lower === s || lower.startsWith(s + ' ') || lower.startsWith(s + '!'))
  ) {
    return true;
  }

  // Short prompts (≤6 words) without browser keywords are likely conversational
  return words.length <= 6;
}

function isHackathonPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return (
    lower.includes('/hackathon-buddy') ||
    (lower.includes('hackathon') &&
      (lower.includes('search') ||
        lower.includes('find') ||
        lower.includes('validate') ||
        lower.includes('ticket')))
  );
}

export async function onBeforeTaskStart(
  callbacks: TaskCallbacks,
  // config may be undefined if TaskManager hasn't been rebuilt; treat as simple (no browser)
  isFirstTask: boolean,
  config?: TaskConfig,
): Promise<void> {
  const prompt = config?.prompt?.trim() ?? '';
  const hackathonOnly = isHackathonPrompt(prompt);
  currentTaskHackathonOnly = hackathonOnly;
  // Hackathon prompts: no browser (Exa does search), use minimal MCP set
  const useBrowser = !hackathonOnly && prompt.length > 0 && !isSimpleConversationalPrompt(prompt);
  currentTaskBrowserOverride = useBrowser ? { mode: 'embedded' } : { mode: 'none' };

  if (useBrowser) {
    if (isFirstTask) {
      callbacks.onProgress({ stage: 'browser', message: 'Preparing browser...', isFirstTask });
    }
    // Use embedded Electron BrowserView (fast, no Playwright) instead of dev-browser server
    pendingBrowserPromise = Promise.resolve().then(() => {
      startEmbeddedBrowserApi();
      return { ready: true, logs: [] as string[] };
    });
  } else {
    console.log('[Main] Simple conversational prompt, skipping browser startup');

    // Config will be regenerated in onBeforeStart (called by adapter.startTask) with currentTaskBrowserOverride
    pendingBrowserPromise = null;
  }
}

export function createElectronTaskManagerOptions(): TaskManagerOptions {
  return {
    adapterOptions: {
      platform: process.platform,
      isPackaged: app.isPackaged,
      tempPath: app.getPath('temp'),
      getCliCommand,
      buildEnvironment,
      onBeforeStart,
      getModelDisplayName,
      buildCliArgs,
      useAgentAdapter: true,
      getAgentConfig: getAgentConfigForTask,
    },
    defaultWorkingDirectory: app.getPath('temp'),
    maxConcurrentTasks: getProviderAwareMaxConcurrent(),
    isCliAvailable,
    onBeforeTaskStart,
  };
}
