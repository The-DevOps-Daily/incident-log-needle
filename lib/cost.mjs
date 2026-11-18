// Cost of one call from the usage the API reported and the list price in
// prices.json. Cached input is priced at the cached rate; reasoning tokens are
// part of completion_tokens and are billed as output. Costs are always
// computed here at score time, never read back from stored records.
import { readFileSync } from 'node:fs';

export const PRICES = JSON.parse(readFileSync(new URL('../prices.json', import.meta.url), 'utf8'));

export function cachedTokens(usage) {
  return usage?.prompt_tokens_details?.cached_tokens ?? usage?.cache_read_input_tokens ?? 0;
}

export function callCost(model, usage) {
  if (!usage) return 0;
  const p = PRICES[model];
  if (!p) throw new Error(`no price for ${model} in prices.json`);
  const cached = cachedTokens(usage);
  const input = (usage.prompt_tokens ?? 0) - cached;
  return (input * p.input + cached * p.cachedInput + (usage.completion_tokens ?? 0) * p.output) / 1e6;
}

// Upper bound for a call that returned no usage block: every prompt character
// counted as one token, plus the full output budget.
export function worstCaseCost(model, promptChars, maxTokens) {
  const p = PRICES[model];
  if (!p) throw new Error(`no price for ${model} in prices.json`);
  return (promptChars * p.input + maxTokens * p.output) / 1e6;
}
