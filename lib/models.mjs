// The models in the test and what each one runs. maxTokens is the output
// budget (reasoning counts against it). maxLength keeps each model inside the
// context window it really accepts. Lengths are DeepSeek V4 tokens; other
// tokenizers count the same text as 0.99x (gpt-oss) to 1.37x (Ministral,
// Nemotron) as many tokens (pilot 1, results/pilot-1).
//   gpt-oss-120b: 128,000 listed; 100k is about 99k of its tokens.
//   Ministral 3 14B: 262,144 listed; 200k would be about 275k of its tokens.
//   Nemotron 3.5 Super VL: 1,048,576 listed, but the server refused 114,689
//   input + 16,384 output tokens with "maximum context length is 131072".
export const MODELS = {
  'openai-gpt-oss-120b': { maxTokens: 4096, maxLength: 100_000, reps: [1, 2, 3] },
  'deepseek-v4-flash-0731': { maxTokens: 16384, maxLength: 200_000, reps: [1, 2, 3] },
  'glm-5.3-flash': { maxTokens: 16384, maxLength: 200_000, reps: [1, 2, 3] },
  'mistral-3-14B': { maxTokens: 2048, maxLength: 100_000, reps: [1, 2, 3] },
  'nemotron-3.5-super-vl': { maxTokens: 16384, maxLength: 50_000, reps: [1, 2, 3] },
  // Two replicas, not three: at $1.32 per 1M input tokens a third would have
  // taken the whole run past the $14 cap (pilot projection).
  'deepseek-v4-pro-0813': { maxTokens: 16384, maxLength: 200_000, reps: [1, 2] },
  // Tried in the pilot only.
  'deepseek-v4.1-flash': { maxTokens: 16384, maxLength: 200_000, reps: [1], pilotOnly: true },
  'glm-5.3': { maxTokens: 16384, maxLength: 200_000, reps: [1], pilotOnly: true },
  'mimo-v2.5-pro': { maxTokens: 16384, maxLength: 200_000, reps: [1], pilotOnly: true },
};
