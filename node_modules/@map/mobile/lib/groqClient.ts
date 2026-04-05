// ─── Groq API client ──────────────────────────────────────────────────────────
// Uses the Groq REST API directly (no Node SDK — React Native compatible)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

export interface GroqMessage {
  role:    'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  id:      string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens:     number;
    completion_tokens: number;
    total_tokens:      number;
  };
}

export class GroqError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'GroqError';
  }
}

// React Native fetch does not expose response.body as a ReadableStream.
// Use XMLHttpRequest instead — onprogress fires incrementally as SSE chunks arrive.
export function streamGroqMessage(
  messages: GroqMessage[],
  onToken:  (token: string) => void,
  signal?:  AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    if (!apiKey) { reject(new GroqError('EXPO_PUBLIC_GROQ_API_KEY is not set')); return; }

    if (signal?.aborted) { reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })); return; }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', GROQ_API_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

    let fullText     = '';
    let processedLen = 0;

    function parseSSEChunk(chunk: string) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const token: string = JSON.parse(payload).choices?.[0]?.delta?.content ?? '';
          if (token) { fullText += token; onToken(token); }
        } catch { /* skip malformed chunk */ }
      }
    }

    xhr.onprogress = () => {
      const newChunk = xhr.responseText.slice(processedLen);
      processedLen   = xhr.responseText.length;
      parseSSEChunk(newChunk);
    };

    xhr.onload = () => {
      parseSSEChunk(xhr.responseText.slice(processedLen)); // flush remainder
      if (xhr.status >= 400) {
        reject(new GroqError(`Groq API error ${xhr.status}`, xhr.status));
      } else {
        resolve(fullText.trim());
      }
    };

    xhr.onerror   = () => reject(new GroqError('Network error'));
    xhr.ontimeout = () => reject(new GroqError('Request timeout'));

    signal?.addEventListener('abort', () => {
      xhr.abort();
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    });

    xhr.send(JSON.stringify({
      model:       GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens:  1024,
      stream:      true,
    }));
  });
}

export async function sendGroqMessage(
  messages: GroqMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) throw new GroqError('EXPO_PUBLIC_GROQ_API_KEY is not set');

  const response = await fetch(GROQ_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens:  1024,
      stream:      false,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new GroqError(
      `Groq API error ${response.status}: ${text}`,
      response.status,
    );
  }

  const data: GroqResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new GroqError('Empty response from Groq');
  return content.trim();
}
