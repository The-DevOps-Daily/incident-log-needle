// The one prompt every model gets. Fixed before the first scored run.
export const SYSTEM = `You help an on-call engineer during an incident. You get the combined log of several services, one event per line, with the line number at the start of each line.

Find the single log line that caused the outage: the root cause (the change or failure that started it), not a symptom and not a later error.

Reply with JSON only, no other text, in this shape:
{"line": <line number>, "quote": "<the log line, copied exactly, without the line number>", "reason": "<one short sentence>"}`;

export function userPrompt(summary, text) {
  return `Incident: ${summary}\n\nLog:\n${text}\n\nWhich line caused the outage? Reply with the JSON only.`;
}
