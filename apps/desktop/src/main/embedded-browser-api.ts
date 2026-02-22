/**
 * Embedded browser API — Electron-native, no Playwright.
 * HTTP server controls a BrowserView for fast, in-process automation.
 */

import { BrowserWindow, BrowserView } from 'electron';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';

const EMBEDDED_BROWSER_PORT = 9230;

let browserWindow: BrowserWindow | null = null;
let browserView: BrowserView | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

function getBrowserView(): BrowserView {
  if (!browserView) {
    browserWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    browserWindow.setBrowserView(browserView);
    browserView.setBounds({ x: 0, y: 0, width: 1280, height: 800 });
    browserView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  }
  return browserView;
}

async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, message: string, status = 500): void {
  sendJson(res, { error: message }, status);
}

export function startEmbeddedBrowserApi(): number {
  if (httpServer) return EMBEDDED_BROWSER_PORT;

  httpServer = createServer(async (req, res) => {
    if (req.method !== 'POST') {
      sendError(res, 'Method not allowed', 405);
      return;
    }

    const url = new URL(req.url ?? '/', `http://localhost`);
    const pathname = url.pathname;

    try {
      const body = (await parseBody(req)) as Record<string, unknown>;
      const view = getBrowserView();
      const wc = view.webContents;

      switch (pathname) {
        case '/navigate': {
          const urlToLoad = (body.url as string) || 'https://www.google.com';
          await wc.loadURL(urlToLoad, { timeout: 15000 });
          sendJson(res, { url: wc.getURL(), title: await wc.getTitle() });
          break;
        }

        case '/snapshot': {
          const selector = body.selector as string | undefined;
          const script = selector
            ? `(function(){
              const el = document.querySelector(${JSON.stringify(selector)});
              if (!el) return JSON.stringify({ error: 'Element not found' });
              return JSON.stringify({ text: el.innerText?.slice(0, 8000) || '', html: el.innerHTML?.slice(0, 2000) || '' });
            })()`
            : `(function(){
              const body = document.body;
              return JSON.stringify({
                text: body?.innerText?.slice(0, 12000) || '',
                url: location.href,
                title: document.title
              });
            })()`;
          const result = await wc.executeJavaScript(script);
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          sendJson(res, parsed);
          break;
        }

        case '/click': {
          const selector = body.selector as string;
          if (!selector) {
            sendError(res, 'selector required');
            return;
          }
          const clicked = await wc.executeJavaScript(`
            (function(){
              const el = document.querySelector(${JSON.stringify(selector)});
              if (el) el.click();
              return !!el;
            })()
          `);
          sendJson(res, { clicked });
          break;
        }

        case '/type': {
          const selector = body.selector as string;
          const text = (body.text as string) || '';
          if (!selector) {
            sendError(res, 'selector required');
            return;
          }
          const typed = await wc.executeJavaScript(`
            (function(){
              const el = document.querySelector(${JSON.stringify(selector)});
              if (!el) return false;
              el.focus();
              el.value = (el.value || '') + ${JSON.stringify(text)};
              el.dispatchEvent(new Event('input', { bubbles: true }));
              return true;
            })()
          `);
          sendJson(res, { typed });
          break;
        }

        case '/scroll': {
          const direction = (body.direction as string) || 'down';
          const amount = (body.amount as number) || 300;
          const result = await wc.executeJavaScript(`
            window.scrollBy(0, ${direction === 'up' ? -amount : amount});
            return { scrolled: true, scrollY: window.scrollY };
          `);
          sendJson(res, result);
          break;
        }

        default:
          sendError(res, 'Not found', 404);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EmbeddedBrowser] API error:', msg);
      sendError(res, msg);
    }
  });

  httpServer.listen(EMBEDDED_BROWSER_PORT, '127.0.0.1', () => {
    console.log(`[EmbeddedBrowser] API ready on port ${EMBEDDED_BROWSER_PORT}`);
  });

  return EMBEDDED_BROWSER_PORT;
}

export function stopEmbeddedBrowserApi(): void {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  if (browserWindow) {
    browserWindow.close();
    browserWindow = null;
  }
  browserView = null;
}

export function getEmbeddedBrowserApiUrl(): string {
  return `http://127.0.0.1:${EMBEDDED_BROWSER_PORT}`;
}
