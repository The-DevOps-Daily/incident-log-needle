# Tests

Exact = the model gave the root-cause line number. Two-sided tests. With this many logs, read p-values as a guide, not a verdict.

## gpt-oss-120b

- By length: 10k 11/15, 25k 9/15, 50k 7/15, 100k 6/15. Trend test z = -1.97, p = 0.049.
- 10k against 100k: Fisher p = 0.139.
- Cause just before the outage (depth 100%): 10/12. Cause at depth 25 to 75%: 16/36. Fisher p = 0.023.
- Queue shape: 0/12. Other four shapes: 33/48. Fisher p = < 0.001.
- Without the queue shape: depth 100% 10/10, depth 25 to 75% 16/29.
- The 27 misses: symptom:symptom 20, decoy 4, component:symptom 2, component:bg-post 1.
- Misses that blamed a line inside the outage: 27; lines after the first symptom: median 0, 23 within the first 6 lines of the outage, 20 exactly the first line of the outage.

## Ministral 3 14B

- By length: 10k 11/15, 25k 11/15, 50k 11/15, 100k 8/15. Trend test z = -1.12, p = 0.264.
- 10k against 100k: Fisher p = 0.450.
- Cause just before the outage (depth 100%): 11/12. Cause at depth 25 to 75%: 22/36. Fisher p = 0.073.
- Queue shape: 2/12. Other four shapes: 39/48. Fisher p = < 0.001.
- Without the queue shape: depth 100% 10/10, depth 25 to 75% 22/29.
- The 19 misses: symptom:symptom 8, missed:change 6, component:symptom 1, component:change 1, symptom:bg-post 1, wrong_number 2.
- Misses that blamed a line inside the outage: 10; lines after the first symptom: median 0, 9 within the first 6 lines of the outage, 9 exactly the first line of the outage.

