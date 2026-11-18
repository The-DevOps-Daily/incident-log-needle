// Filters and prompts for the two-step baselines (scripts/05-two-step.mjs).
// Fixed before the first baseline run.

// What a person would grep for first: error and warning words, 5xx statuses,
// klog error lines.
export const ERRORS = /\b(error|err|fatal|panic|fail(ed|ure|s)?|exception|warn(ing)?|crit(ical)?|timeout|timed out|refused|denied|expired|invalid|unavailable|oom\w*|killed|back-?off)\b|level=(warn|error|fatal)|" 5\d\d |\bE\d{4} /i;
// Lines that look like a change. Chosen knowing what the planted causes look
// like, so this filter is a best case for grep.
export const CHANGES = /\b(change[ds]?|patch(ed)?|appl(y|ied)|reload(ed)?|config|set|scaled?|paused?|resumed?|deploy(ed)?|rollout|rolled|updated?|upgraded?|restart(ed)?|enabled?|disabled?)\b|->/i;

export const CHUNK_TOKENS = 20_000;

export const MAP_SYSTEM = `You help an on-call engineer during an incident. You get one part of a longer combined log of several services, one event per line, with the line number at the start of each line.

List up to 3 lines from this part that could be the root cause of the outage (the change or failure that started it), not symptoms. If nothing in this part could have started it, return an empty list.

Reply with JSON only, no other text, in this shape:
{"candidates": [{"line": <line number>, "reason": "<one short sentence>"}]}`;

export function mapPrompt(summary, part, i, n) {
  return `Incident: ${summary}\n\nThis is part ${i} of ${n} of the log (line numbers are from the full log):\n${part}\n\nList the candidate lines. Reply with the JSON only.`;
}

export function filteredPrompt(summary, kept, k, n) {
  return `Incident: ${summary}\n\nLog (only the ${k} of ${n} lines that matched a filter are shown; line numbers are from the full log):\n${kept}\n\nWhich line caused the outage? Reply with the JSON only.`;
}

export function reducePrompt(summary, cands, tail) {
  return `Incident: ${summary}\n\nA first pass over the whole log picked these candidate lines (line numbers are from the full log):\n${cands || '(none)'}\n\nThese are the last 40 lines of the log:\n${tail}\n\nWhich line caused the outage? Reply with the JSON only.`;
}

// Split numbered log lines into parts of about maxChars each.
export function chunkLines(lines, maxChars) {
  const parts = [];
  let cur = [];
  let size = 0;
  for (const l of lines) {
    if (size + l.length > maxChars && cur.length) {
      parts.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(l);
    size += l.length + 1;
  }
  if (cur.length) parts.push(cur);
  return parts;
}
