/**
 * TEST FIXTURE ONLY. Production has no AI_CONFIRMED_FREE value: the owner adds one after checking each provider's
 * billing page. Unit tests use this list to simulate an owner who confirmed these built-in models as free, so the
 * routing and error-handling tests can run. It never proves that any model is free.
 */
export const OWNER_CONFIRMED_TEST_ONLY = [
  'groq:llama-3.1-8b-instant',
  'groq:llama-3.3-70b-versatile',
  'groq:openai/gpt-oss-20b',
  'groq:openai/gpt-oss-120b',
  'deepseek:deepseek-chat',
  'mistral:mistral-small-latest',
  'mistral:open-mistral-nemo',
  'sambanova:Meta-Llama-3.3-70B-Instruct',
  'sambanova:Meta-Llama-3.1-8B-Instruct',
  'cloudflare:@cf/meta/llama-3.1-8b-instruct',
  'cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  'cloudflare:@cf/mistralai/mistral-small-3.1-24b-instruct',
  'siliconflow:Qwen/Qwen3-8B',
  'siliconflow:THUDM/glm-4-9b-0414',
  'siliconflow:Qwen/Qwen2.5-7B-Instruct'
].join(',');
