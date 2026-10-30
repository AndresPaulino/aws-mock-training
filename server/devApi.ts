// Vite dev-server middleware: progress file sync + Claude tutor proxy.
// Runs only under `npm run dev` (localhost), so the API key never reaches the browser.
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const PROGRESS_FILE = resolve('progress/progress.json');
const MAX_BODY = 20 * 1024 * 1024;
const MODELS = { sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' } as const;

const SYSTEM = `You are the tutor inside "Cloud Gauntlet", a training app that takes an AWS beginner to passing the AWS Certified Solutions Architect – Associate (SAA-C03) exam. The learner has no AWS account; the app has a simulated AWS console, lessons, labs, an architecture builder and practice exams.

How to tutor:
- Explain in plain English first, then the precise AWS detail. Use a short analogy when a concept is abstract.
- Tie answers back to the exam: name the keywords in a question that point to the right answer and the distractor traps.
- When the learner got a question wrong, diagnose the misconception behind their choice before explaining the right answer.
- Prefer short answers (under ~250 words) unless asked to go deeper. Use markdown bullets and **bold** for key terms; no tables wider than 3 columns.
- Be accurate as of 2026 and use current service names. If something is uncertain or changed recently, say so.
- Never give the answer to a practice question the learner is still working on unless they ask for it; offer a hint first.`;

async function readBody(req: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error('Body too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

interface TutorRequest {
  model?: keyof typeof MODELS;
  context?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export function devApi(apiKey: string | undefined): Plugin {
  const client = apiKey ? new Anthropic({ apiKey }) : null;
  return {
    name: 'cloud-gauntlet-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        try {
          if (url === '/api/progress' && req.method === 'GET') {
            try {
              res.setHeader('Content-Type', 'application/json');
              res.end(await readFile(PROGRESS_FILE, 'utf8'));
            } catch {
              json(res, 404, { error: 'no progress file yet' });
            }
            return;
          }
          if (url === '/api/progress' && req.method === 'PUT') {
            const body = await readBody(req);
            const parsed = JSON.parse(body); // reject malformed JSON before touching the file
            await mkdir(dirname(PROGRESS_FILE), { recursive: true });
            await writeFile(PROGRESS_FILE, JSON.stringify(parsed, null, 1) + '\n', 'utf8');
            json(res, 200, { ok: true });
            return;
          }
          if (url === '/api/tutor/status') {
            json(res, 200, { enabled: !!client });
            return;
          }
          if (url === '/api/tutor' && req.method === 'POST') {
            if (!client) return json(res, 503, { error: 'Add ANTHROPIC_API_KEY to .env and restart `npm run dev`.' });
            const body = JSON.parse(await readBody(req)) as TutorRequest;
            const model = MODELS[body.model ?? 'sonnet'] ?? MODELS.sonnet;
            const messages = (body.messages ?? []).slice(-30).filter((m) => m.content?.trim());
            if (!messages.length || messages[0].role !== 'user') return json(res, 400, { error: 'messages must start with a user turn' });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            const stream = client.beta.messages.stream({
              model,
              max_tokens: 8000,
              betas: ['server-side-fallback-2026-07-01'],
              fallbacks: 'default',
              output_config: { effort: 'medium' },
              system: body.context ? `${SYSTEM}\n\nWhat the learner is looking at right now:\n${body.context.slice(0, 12000)}` : SYSTEM,
              messages,
            } as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
            req.on('close', () => stream.abort());
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') res.write(event.delta.text);
            }
            const final = await stream.finalMessage();
            if (final.stop_reason === 'refusal') res.write('\n\n_(The tutor declined to answer that one. Try rephrasing.)_');
            if (final.stop_reason === 'max_tokens') res.write('\n\n_(Answer cut off. Ask me to continue.)_');
            res.end();
            return;
          }
        } catch (e) {
          const msg =
            e instanceof Anthropic.AuthenticationError ? 'Invalid API key in .env.'
            : e instanceof Anthropic.RateLimitError ? 'Rate limited. Wait a moment and retry.'
            : e instanceof Anthropic.APIError ? `Claude API error ${e.status}: ${e.message}`
            : e instanceof Error ? e.message : String(e);
          if (!res.headersSent) json(res, 500, { error: msg });
          else res.end(`\n\n**Error:** ${msg}`);
          return;
        }
        next();
      });
    },
  };
}
