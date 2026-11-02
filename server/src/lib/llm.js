import OpenAI from 'openai';
import { z } from 'zod';

const env = (key) => process.env[`LLM_${key}`] || process.env[`OPENAI_${key}`];
const LIMITS = new Set(['minimum', 'maximum', 'minItems', 'maxItems']);

let client;
let jsonOnly = false;

function getClient() {
  const apiKey = env('API_KEY');
  if (!apiKey) throw new Error('LLM_API_KEY is not set on the server.');
  client ??= new OpenAI({ apiKey, baseURL: env('BASE_URL') || undefined, maxRetries: 5, timeout: 90_000 });
  return client;
}

const strip = (node) => {
  if (Array.isArray(node)) return node.map(strip);
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([k]) => k !== '$schema' && !LIMITS.has(k))
      .map(([k, v]) => [k, strip(v)]),
  );
};

const readJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

async function create(system, user, format) {
  const effort = env('REASONING_EFFORT');
  const temp = env('TEMPERATURE');
  const res = await getClient().chat.completions.create({
    model: env('MODEL') || 'gemini-3.8-flash',
    response_format: format,
    ...(temp && { temperature: Number(temp) }),
    ...(effort && { reasoning_effort: effort }),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const msg = res.choices[0]?.message;
  if (msg?.refusal) throw new Error(`The model declined: ${msg.refusal}`);
  return msg?.content;
}

async function complete(name, system, user, schema) {
  if (!jsonOnly) {
    try {
      return await create(system, user, { type: 'json_schema', json_schema: { name, strict: true, schema } });
    } catch (err) {
      if (err?.status !== 400 || !/response_format|json|schema/i.test(err.message)) throw err;
      jsonOnly = true;
    }
  }
  const hint = `\n\nReply with one JSON object that matches this JSON Schema:\n${JSON.stringify(schema)}`;
  return create(system + hint, user, { type: 'json_object' });
}

export async function ask({ name, system, user, schema }) {
  const json = strip(z.toJSONSchema(schema, { target: 'draft-7' }));

  for (let attempt = 1; attempt <= 2; attempt++) {
    const out = schema.safeParse(readJson(await complete(name, system, user, json)));
    if (out.success) return out.data;
  }
  throw new Error(`The model returned an invalid ${name}.`);
}
