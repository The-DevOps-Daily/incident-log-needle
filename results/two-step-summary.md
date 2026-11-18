# Two-step baselines

Same verdict rules as the main run. "Cause sent" counts the logs where the root-cause line reached the model that gave the final answer: kept by the filter, or picked as a candidate by the chunk pass. Cost prices every prompt token at the input rate. Wall time for chunks is the parallel map pass plus the final call.

| Model | Length | Method | Exact (95% CI) | Cause sent | Lines kept / candidates (p50) | Prompt tokens per query (p50) | $ per query | Wall p50 / p90 | Verdicts | Against the whole log (only this right / only whole right, sign test p) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DeepSeek V4 Flash 0731 | 100k | whole | 15/15 (80 to 100%) | 15/15 | - | 102350 | 0.01448 | 5.0 s / 7.4 s | exact 15 | - |
| DeepSeek V4 Flash 0731 | 100k | grep-errors | 3/15 (7 to 45%) | 3/15 | 91 | 6226 | 0.00191 | 19.7 s / 51.0 s | exact 3, symptom 6, missed 1, invalid 5 | 0 / 12, p = 0.000 |
| DeepSeek V4 Flash 0731 | 100k | grep-changes | 15/15 (80 to 100%) | 15/15 | 272 | 15073 | 0.00217 | 2.1 s / 3.8 s | exact 15 | 0 / 0, p = 1.000 |
| DeepSeek V4 Flash 0731 | 100k | chunks | 14/15 (70 to 99%) | 14/15 | 4 | 106642 | 0.02281 | 43.1 s / 64.6 s | exact 14, symptom 1 | 0 / 1, p = 1.000 |
| DeepSeek V4 Flash 0731 | 200k | whole | 15/15 (80 to 100%) | 15/15 | - | 204724 | 0.02886 | 9.1 s / 10.8 s | exact 15 | - |
| DeepSeek V4 Flash 0731 | 200k | grep-errors | 3/15 (7 to 45%) | 3/15 | 188 | 11898 | 0.00285 | 26.8 s / 48.9 s | exact 3, symptom 8, invalid 4 | 0 / 12, p = 0.000 |
| DeepSeek V4 Flash 0731 | 200k | grep-changes | 15/15 (80 to 100%) | 15/15 | 543 | 29074 | 0.00415 | 2.6 s / 5.1 s | exact 15 | 0 / 0, p = 1.000 |
| DeepSeek V4 Flash 0731 | 200k | chunks | 14/15 (70 to 99%) | 14/15 | 6 | 210334 | 0.04729 | 68.8 s / 82.9 s | exact 14, symptom 1 | 0 / 1, p = 1.000 |
| gpt-oss-120b | 100k | whole | 6/15 (20 to 64%) | 15/15 | - | 101815 | 0.01073 | 20.1 s / 27.1 s | exact 6, decoy 2, symptom 7 | - |
| gpt-oss-120b | 100k | grep-errors | 3/15 (7 to 45%) | 3/15 | 91 | 6148 | 0.00090 | 6.1 s / 8.3 s | exact 3, symptom 12 | 1 / 4, p = 0.375 |
| gpt-oss-120b | 100k | grep-changes | 13/15 (62 to 96%) | 15/15 | 272 | 15134 | 0.00181 | 7.7 s / 9.3 s | exact 13, symptom 2 | 7 / 0, p = 0.016 |
| gpt-oss-120b | 100k | chunks | 11/15 (48 to 89%) | 11/15 | 15 | 106497 | 0.01418 | 26.3 s / 38.1 s | exact 11, decoy 1, component 1, symptom 2 | 5 / 0, p = 0.063 |
| gpt-oss-120b | 200k | grep-errors | 3/15 (7 to 45%) | 3/15 | 188 | 11653 | 0.00152 | 7.6 s / 10.1 s | exact 3, component 2, symptom 10 | - |
| gpt-oss-120b | 200k | grep-changes | 13/15 (62 to 96%) | 15/15 | 543 | 29096 | 0.00326 | 7.7 s / 12.4 s | exact 13, symptom 2 | - |
| gpt-oss-120b | 200k | chunks | 3/3 (44 to 100%) | 3/3 | 24 | 209927 | 0.02733 | 28.8 s / 36.9 s | exact 3 | - |
