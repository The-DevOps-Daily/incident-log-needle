# Results

17 scored calls, stamp `fe687fd7f9d0fa48`, 2026-11-18T11:45:59.590Z to 2026-11-18T11:46:34.050Z. Prices: https://docs.digitalocean.com/products/inference/details/pricing/ (page says 'Last verified 17 Nov 2026'; read 2026-11-18). USD per 1M tokens, standard processing.

## Root-cause line found (exact line number), by length

| Model | 10k | 25k | 50k | 100k | 200k | All (95% CI) |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | n/a | n/a | 1/1 | 0/1 | n/a | 1/2 (9.5 to 90.5%) |
| DeepSeek V4 Flash 0731 | n/a | n/a | 1/1 | 1/1 | 2/2 | 4/4 (51.0 to 100.0%) |
| GLM-5.3 Flash | n/a | n/a | 1/1 | 1/1 | 2/2 | 4/4 (51.0 to 100.0%) |
| Ministral 3 14B Instruct | n/a | n/a | 1/1 | 0/1 | n/a | 1/2 (9.5 to 90.5%) |
| NVIDIA Nemotron 3.5 Super VL | n/a | n/a | 1/1 | n/a | n/a | 1/1 (20.7 to 100.0%) |
| DeepSeek V4 Pro 0813 | n/a | n/a | 1/1 | 1/1 | 2/2 | 4/4 (51.0 to 100.0%) |

## Verdicts by model and length

| Model | Length | exact | wrong_number | decoy | component | symptom | missed | invalid | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | 50k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| gpt-oss-120b | 100k | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| DeepSeek V4 Flash 0731 | 50k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Flash 0731 | 100k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Flash 0731 | 200k | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GLM-5.3 Flash | 50k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GLM-5.3 Flash | 100k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GLM-5.3 Flash | 200k | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ministral 3 14B Instruct | 50k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ministral 3 14B Instruct | 100k | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| NVIDIA Nemotron 3.5 Super VL | 50k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Pro 0813 | 50k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Pro 0813 | 100k | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Pro 0813 | 200k | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Exact by length and depth (out of 3 haystacks per cell)

### gpt-oss-120b

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 50k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| 100k | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 |

### DeepSeek V4 Flash 0731

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 50k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| 100k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| 200k | 1/1 | 0/0 | 0/0 | 0/0 | 1/1 |

### GLM-5.3 Flash

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 50k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| 100k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| 200k | 1/1 | 0/0 | 0/0 | 0/0 | 1/1 |

### Ministral 3 14B Instruct

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 50k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| 100k | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 |

### NVIDIA Nemotron 3.5 Super VL

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 50k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |

### DeepSeek V4 Pro 0813

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 50k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| 100k | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| 200k | 1/1 | 0/0 | 0/0 | 0/0 | 1/1 |

## Cost, tokens and latency per call

| Model | Length | Prompt tokens (p50) | Output tokens (p50) | $ per call | TTFT p50 / p90 | Total p50 / p90 / max |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | 50k | 50493 | 594 | 0.00547 | 3.3 s / 3.3 s | 11.2 s / 11.2 s / 11.2 s |
| gpt-oss-120b | 100k | 101460 | 906 | 0.01078 | 8.9 s / 8.9 s | 21.3 s / 21.3 s / 21.3 s |
| DeepSeek V4 Flash 0731 | 50k | 50768 | 300 | 0.00719 | 2.0 s / 2.0 s | 2.8 s / 2.8 s / 2.8 s |
| DeepSeek V4 Flash 0731 | 100k | 102119 | 369 | 0.01440 | 3.5 s / 3.5 s | 4.5 s / 4.5 s / 4.5 s |
| DeepSeek V4 Flash 0731 | 200k | 204747.5 | 360 | 0.02877 | 7.3 s / 7.5 s | 8.4 s / 8.6 s / 8.7 s |
| GLM-5.3 Flash | 50k | 53347 | 819 | 0.00841 | 3.3 s / 3.3 s | 17.1 s / 17.1 s / 17.1 s |
| GLM-5.3 Flash | 100k | 106737 | 717 | 0.01637 | 4.5 s / 4.5 s | 10.0 s / 10.0 s / 10.0 s |
| GLM-5.3 Flash | 200k | 214776.5 | 2119.5 | 0.03328 | 8.5 s / 8.9 s | 26.0 s / 32.6 s / 34.3 s |
| Ministral 3 14B Instruct | 50k | 69605 | 91 | 0.01392 | 11.5 s / 11.5 s | 24.2 s / 24.2 s / 24.2 s |
| Ministral 3 14B Instruct | 100k | 140027 | 84 | 0.02800 | 39.5 s / 39.5 s | 62.2 s / 62.2 s / 62.2 s |
| NVIDIA Nemotron 3.5 Super VL | 50k | 69616 | 582 | 0.02126 | 2.7 s / 2.7 s | 7.8 s / 7.8 s / 7.8 s |
| DeepSeek V4 Pro 0813 | 50k | 50768 | 828 | 0.07029 | 4.0 s / 4.0 s | 8.2 s / 8.2 s / 8.2 s |
| DeepSeek V4 Pro 0813 | 100k | 102119 | 550 | 0.13698 | 6.8 s / 6.8 s | 9.5 s / 9.5 s / 9.5 s |
| DeepSeek V4 Pro 0813 | 200k | 204747.5 | 1942.5 | 0.27796 | 12.3 s / 12.7 s | 22.6 s / 24.4 s / 24.8 s |

## Paired comparisons (same haystacks, exact sign test)

| A | B | Shared | Only A right | Only B right | p |
| --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | DeepSeek V4 Flash 0731 | 2 | 0 | 1 | 1.000 |
| gpt-oss-120b | GLM-5.3 Flash | 2 | 0 | 1 | 1.000 |
| gpt-oss-120b | Ministral 3 14B Instruct | 2 | 0 | 0 | 1.000 |
| gpt-oss-120b | NVIDIA Nemotron 3.5 Super VL | 1 | 0 | 0 | 1.000 |
| gpt-oss-120b | DeepSeek V4 Pro 0813 | 2 | 0 | 1 | 1.000 |
| DeepSeek V4 Flash 0731 | GLM-5.3 Flash | 4 | 0 | 0 | 1.000 |
| DeepSeek V4 Flash 0731 | Ministral 3 14B Instruct | 2 | 1 | 0 | 1.000 |
| DeepSeek V4 Flash 0731 | NVIDIA Nemotron 3.5 Super VL | 1 | 0 | 0 | 1.000 |
| DeepSeek V4 Flash 0731 | DeepSeek V4 Pro 0813 | 4 | 0 | 0 | 1.000 |
| GLM-5.3 Flash | Ministral 3 14B Instruct | 2 | 1 | 0 | 1.000 |
| GLM-5.3 Flash | NVIDIA Nemotron 3.5 Super VL | 1 | 0 | 0 | 1.000 |
| GLM-5.3 Flash | DeepSeek V4 Pro 0813 | 4 | 0 | 0 | 1.000 |
| Ministral 3 14B Instruct | NVIDIA Nemotron 3.5 Super VL | 1 | 0 | 0 | 1.000 |
| Ministral 3 14B Instruct | DeepSeek V4 Pro 0813 | 2 | 0 | 1 | 1.000 |
| NVIDIA Nemotron 3.5 Super VL | DeepSeek V4 Pro 0813 | 1 | 0 | 0 | 1.000 |

## Every answer that was not the exact line

- gpt-oss-120b t100k-d000-r1 (queue): symptom line 1716 (needle 1, symptom checkout-api)
- Ministral 3 14B Instruct t100k-d000-r1 (queue): symptom line 1724 (needle 1, symptom alertmanager)

## Retries

- gpt-oss-120b: 0 calls needed a retry; attempt statuses {"200":2}; finish {"stop":2}
- DeepSeek V4 Flash 0731: 0 calls needed a retry; attempt statuses {"200":4}; finish {"stop":4}
- GLM-5.3 Flash: 1 calls needed a retry; attempt statuses {"200":4,"529":2}; finish {"stop":4}
- Ministral 3 14B Instruct: 0 calls needed a retry; attempt statuses {"200":2}; finish {"stop":2}
- NVIDIA Nemotron 3.5 Super VL: 0 calls needed a retry; attempt statuses {"200":1}; finish {"stop":1}
- DeepSeek V4 Pro 0813: 0 calls needed a retry; attempt statuses {"200":4}; finish {"stop":4}
