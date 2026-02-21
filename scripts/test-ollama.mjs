#!/usr/bin/env node
/**
 * Quick Ollama connectivity test.
 * Run: node scripts/test-ollama.mjs [model]
 * Example: node scripts/test-ollama.mjs llama3.2:1b
 */
const model = process.argv[2] || 'llama3.2:1b';
const baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';

async function test() {
  console.log(`Testing Ollama at ${baseUrl} with model "${model}"...`);
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say hello in one short sentence.' }],
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const text = data.message?.content?.trim() || '(no content)';
    console.log('Success! Response:', text);
  } catch (err) {
    console.error('Failed:', err.message);
    console.error('Make sure Ollama is running: ollama serve');
    console.error('And model is pulled: ollama pull', model);
    process.exit(1);
  }
}
test();
