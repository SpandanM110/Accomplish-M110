# Windows Setup (NVIDIA GTX 1650)

This guide helps you run Accomplish M110 smoothly on Windows with an NVIDIA GTX 1650 (4GB VRAM).

## GPU Configuration

To reduce sudden crashes, **hardware acceleration is disabled by default** on Windows. The app uses software rendering, which is more stable on some systems.

If the app runs fine and you want better performance, enable GPU:

```powershell
$env:ACCOMPLISH_GPU="1"; pnpm dev
```

If you enabled GPU and see crashes, remove the env var to go back to software rendering.

## OpenCode CLI (required for tasks)

The app needs the OpenCode CLI to run tasks. On Windows, ensure `opencode-windows-x64` is installed:

```powershell
pnpm install
```

If you see "OpenCode CLI is not available", run `pnpm install` from the project root to install the Windows binary.

## Local AI Models (Ollama / LM Studio)

With 4GB VRAM, use smaller models for best performance:

### Recommended Ollama models

| Model              | Size   | VRAM  | Notes                    |
|--------------------|--------|-------|--------------------------|
| `phi3:mini`        | ~2.2GB | ~3GB  | Fast, good for tasks     |
| `qwen2:0.5b`       | ~0.5GB | ~1GB  | Very fast, basic tasks    |
| `gemma2:2b`        | ~1.6GB | ~2GB  | Good balance             |
| `llama3.2:3b`      | ~2GB   | ~2.5GB| Solid general use        |
| `mistral:7b-instruct-q4_0` | ~4GB | ~4.5GB | Fits if nothing else runs |

### LM Studio

- Load a **4B or smaller** model, preferably quantized (Q4, Q5)
- Avoid 7B+ models unless heavily quantized (Q2, Q3)

### Ollama setup

1. Install [Ollama](https://ollama.com)
2. Pull a small model: `ollama pull phi3:mini`
3. In Accomplish M110, connect to Ollama at `http://localhost:11434`

## Schema version mismatch ("Update Required")

If you see "This data was created by a newer version of Accomplish M110 (schema v10)":

1. **In the dialog** – click **"Reset data and start fresh"** to clear old data and relaunch.
2. **Manual reset** – close the app, delete `%APPDATA%\Accomplish M110`, then start again.

## Running the app

```powershell
pnpm install
pnpm dev
```

If the app closes immediately or doesn't start, try the **two-step process**:

**Terminal 1** – start the web server:
```powershell
pnpm -F @accomplish/web dev
```
Wait until you see `Local: http://localhost:5173`, then leave it running.  
If it shows a different port (e.g. 5174), use that port in Terminal 2.

**Terminal 2** – start Electron (use the same port as the web server):
```powershell
$env:ACCOMPLISH_ROUTER_URL="http://localhost:5173"; pnpm -F @accomplish/desktop dev:fast
```
If your web server is on 5174, use: `$env:ACCOMPLISH_ROUTER_URL="http://localhost:5174"`

For a clean start (clears stored data):

```powershell
pnpm dev:clean
```
