# Results

365 scored calls, stamp `73f5f90ea7e43a3b`, 2026-11-18T11:49:41.148Z to 2026-11-18T12:10:17.510Z. Prices: https://docs.digitalocean.com/products/inference/details/pricing/ (page says 'Last verified 17 Nov 2026'; read 2026-11-18). USD per 1M tokens, standard processing.

## Root-cause line found (exact line number), by length

| Model | 10k | 25k | 50k | 100k | 200k | All (95% CI) |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | 11/15 | 9/15 | 7/15 | 6/15 | n/a | 33/60 (42.5 to 66.9%) |
| DeepSeek V4 Flash 0731 | 15/15 | 15/15 | 15/15 | 15/15 | 15/15 | 75/75 (95.1 to 100.0%) |
| GLM-5.3 Flash | 15/15 | 15/15 | 15/15 | 15/15 | 15/15 | 75/75 (95.1 to 100.0%) |
| Ministral 3 14B | 11/15 | 11/15 | 11/15 | 8/15 | n/a | 41/60 (55.8 to 78.7%) |
| NVIDIA Nemotron 3.5 Super VL | 14/15 | 15/15 | 15/15 | n/a | n/a | 44/45 (88.4 to 99.6%) |
| DeepSeek V4 Pro 0813 | 10/10 | 10/10 | 10/10 | 9/10 | 10/10 | 49/50 (89.5 to 99.6%) |

## Verdicts by model and length

| Model | Length | exact | wrong_number | decoy | component | symptom | missed | invalid | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | 10k | 11 | 0 | 0 | 1 | 3 | 0 | 0 | 0 |
| gpt-oss-120b | 25k | 9 | 0 | 0 | 0 | 6 | 0 | 0 | 0 |
| gpt-oss-120b | 50k | 7 | 0 | 2 | 2 | 4 | 0 | 0 | 0 |
| gpt-oss-120b | 100k | 6 | 0 | 2 | 0 | 7 | 0 | 0 | 0 |
| DeepSeek V4 Flash 0731 | 10k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Flash 0731 | 25k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Flash 0731 | 50k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Flash 0731 | 100k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Flash 0731 | 200k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GLM-5.3 Flash | 10k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GLM-5.3 Flash | 25k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GLM-5.3 Flash | 50k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GLM-5.3 Flash | 100k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| GLM-5.3 Flash | 200k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ministral 3 14B | 10k | 11 | 0 | 0 | 0 | 1 | 3 | 0 | 0 |
| Ministral 3 14B | 25k | 11 | 0 | 0 | 1 | 1 | 2 | 0 | 0 |
| Ministral 3 14B | 50k | 11 | 1 | 0 | 1 | 1 | 1 | 0 | 0 |
| Ministral 3 14B | 100k | 8 | 1 | 0 | 0 | 6 | 0 | 0 | 0 |
| NVIDIA Nemotron 3.5 Super VL | 10k | 14 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| NVIDIA Nemotron 3.5 Super VL | 25k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| NVIDIA Nemotron 3.5 Super VL | 50k | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Pro 0813 | 10k | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Pro 0813 | 25k | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Pro 0813 | 50k | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Pro 0813 | 100k | 9 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| DeepSeek V4 Pro 0813 | 200k | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Exact by length and depth (out of 3 haystacks per cell)

### gpt-oss-120b

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 10k | 3/3 | 2/3 | 2/3 | 1/3 | 3/3 |
| 25k | 2/3 | 2/3 | 1/3 | 1/3 | 3/3 |
| 50k | 1/3 | 1/3 | 1/3 | 2/3 | 2/3 |
| 100k | 1/3 | 1/3 | 1/3 | 1/3 | 2/3 |

### DeepSeek V4 Flash 0731

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 10k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 25k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 50k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 100k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 200k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |

### GLM-5.3 Flash

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 10k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 25k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 50k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 100k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 200k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |

### Ministral 3 14B

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 10k | 2/3 | 2/3 | 2/3 | 2/3 | 3/3 |
| 25k | 2/3 | 1/3 | 2/3 | 3/3 | 3/3 |
| 50k | 2/3 | 1/3 | 2/3 | 3/3 | 3/3 |
| 100k | 2/3 | 1/3 | 1/3 | 2/3 | 2/3 |

### NVIDIA Nemotron 3.5 Super VL

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 10k | 3/3 | 2/3 | 3/3 | 3/3 | 3/3 |
| 25k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 50k | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |

### DeepSeek V4 Pro 0813

| Length | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 10k | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| 25k | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| 50k | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| 100k | 2/2 | 1/2 | 2/2 | 2/2 | 2/2 |
| 200k | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 |

## Cost, tokens and latency per call

$ per call prices every prompt token at the input rate (a first paste). Latency leaves out calls served from the prompt cache (listed below).

| Model | Length | Prompt tokens (p50) | Output tokens (p50) | $ per call | TTFT p50 / p90 | Total p50 / p90 / max |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | 10k | 10736 | 408 | 0.00139 | 1.0 s / 1.2 s | 7.2 s / 9.6 s / 13.8 s |
| gpt-oss-120b | 25k | 25792 | 425 | 0.00293 | 1.8 s / 1.9 s | 7.4 s / 12.7 s / 13.1 s |
| gpt-oss-120b | 50k | 50659 | 603 | 0.00554 | 3.4 s / 3.6 s | 12.0 s / 18.1 s / 20.2 s |
| gpt-oss-120b | 100k | 101815 | 659 | 0.01073 | 8.7 s / 10.1 s | 20.1 s / 27.1 s / 54.2 s |
| DeepSeek V4 Flash 0731 | 10k | 10807 | 390 | 0.00165 | 0.8 s / 2.1 s | 2.4 s / 7.3 s / 19.9 s |
| DeepSeek V4 Flash 0731 | 25k | 25985 | 438 | 0.00376 | 1.2 s / 1.7 s | 2.5 s / 4.9 s / 6.3 s |
| DeepSeek V4 Flash 0731 | 50k | 51056 | 428 | 0.00728 | 1.9 s / 2.6 s | 3.4 s / 4.4 s / 4.7 s |
| DeepSeek V4 Flash 0731 | 100k | 102350 | 441 | 0.01448 | 3.6 s / 4.3 s | 5.0 s / 7.4 s / 13.3 s |
| DeepSeek V4 Flash 0731 | 200k | 204724 | 403 | 0.02886 | 7.6 s / 9.1 s | 9.1 s / 10.8 s / 12.4 s |
| GLM-5.3 Flash | 10k | 11152 | 599 | 0.00198 | 0.9 s / 1.1 s | 6.4 s / 7.8 s / 8.4 s |
| GLM-5.3 Flash | 25k | 27025 | 721 | 0.00440 | 1.5 s / 1.8 s | 6.7 s / 12.2 s / 13.6 s |
| GLM-5.3 Flash | 50k | 53528 | 813 | 0.00896 | 2.5 s / 2.8 s | 8.0 s / 30.4 s / 154.4 s |
| GLM-5.3 Flash | 100k | 107158 | 969 | 0.01719 | 4.5 s / 4.7 s | 14.1 s / 68.4 s / 134.9 s |
| GLM-5.3 Flash | 200k | 214585 | 1151 | 0.03302 | 8.7 s / 9.5 s | 18.7 s / 39.5 s / 54.3 s |
| Ministral 3 14B | 10k | 14586 | 92 | 0.00296 | 1.4 s / 1.9 s | 5.2 s / 7.2 s / 8.2 s |
| Ministral 3 14B | 25k | 35488 | 95 | 0.00712 | 3.8 s / 4.0 s | 11.3 s / 15.0 s / 16.0 s |
| Ministral 3 14B | 50k | 70017 | 91 | 0.01407 | 11.5 s / 12.0 s | 24.1 s / 33.6 s / 33.9 s |
| Ministral 3 14B | 100k | 140729 | 115 | 0.02822 | 40.6 s / 41.4 s | 71.4 s / 84.6 s / 88.9 s |
| NVIDIA Nemotron 3.5 Super VL | 10k | 14597 | 714 | 0.00559 | 0.8 s / 1.0 s | 5.4 s / 7.8 s / 102.8 s |
| NVIDIA Nemotron 3.5 Super VL | 25k | 35499 | 947 | 0.01132 | 1.2 s / 1.7 s | 7.2 s / 12.0 s / 17.2 s |
| NVIDIA Nemotron 3.5 Super VL | 50k | 70028 | 937 | 0.02176 | 2.0 s / 2.4 s | 8.6 s / 12.5 s / 25.0 s |
| DeepSeek V4 Pro 0813 | 10k | 10821.5 | 836 | 0.01910 | 1.3 s / 1.9 s | 7.7 s / 16.0 s / 18.0 s |
| DeepSeek V4 Pro 0813 | 25k | 25918 | 1272.5 | 0.03989 | 2.1 s / 2.5 s | 11.5 s / 15.7 s / 23.5 s |
| DeepSeek V4 Pro 0813 | 50k | 50989.5 | 871 | 0.07115 | 3.6 s / 4.5 s | 9.7 s / 17.4 s / 17.7 s |
| DeepSeek V4 Pro 0813 | 100k | 102401 | 1227.5 | 0.14166 | 6.1 s / 6.6 s | 14.1 s / 19.8 s / 30.6 s |
| DeepSeek V4 Pro 0813 | 200k | 204679.5 | 1277.5 | 0.27565 | 11.9 s / 12.2 s | 19.6 s / 24.6 s / 35.5 s |

## Paired comparisons (same haystacks, exact sign test)

| A | B | Shared | Only A right | Only B right | p |
| --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | DeepSeek V4 Flash 0731 | 60 | 0 | 27 | 0.000 |
| gpt-oss-120b | GLM-5.3 Flash | 60 | 0 | 27 | 0.000 |
| gpt-oss-120b | Ministral 3 14B | 60 | 3 | 11 | 0.057 |
| gpt-oss-120b | NVIDIA Nemotron 3.5 Super VL | 45 | 0 | 17 | 0.000 |
| gpt-oss-120b | DeepSeek V4 Pro 0813 | 40 | 1 | 15 | 0.001 |
| DeepSeek V4 Flash 0731 | GLM-5.3 Flash | 75 | 0 | 0 | 1.000 |
| DeepSeek V4 Flash 0731 | Ministral 3 14B | 60 | 19 | 0 | 0.000 |
| DeepSeek V4 Flash 0731 | NVIDIA Nemotron 3.5 Super VL | 45 | 1 | 0 | 1.000 |
| DeepSeek V4 Flash 0731 | DeepSeek V4 Pro 0813 | 50 | 1 | 0 | 1.000 |
| GLM-5.3 Flash | Ministral 3 14B | 60 | 19 | 0 | 0.000 |
| GLM-5.3 Flash | NVIDIA Nemotron 3.5 Super VL | 45 | 1 | 0 | 1.000 |
| GLM-5.3 Flash | DeepSeek V4 Pro 0813 | 50 | 1 | 0 | 1.000 |
| Ministral 3 14B | NVIDIA Nemotron 3.5 Super VL | 45 | 0 | 11 | 0.001 |
| Ministral 3 14B | DeepSeek V4 Pro 0813 | 40 | 1 | 14 | 0.001 |
| NVIDIA Nemotron 3.5 Super VL | DeepSeek V4 Pro 0813 | 30 | 0 | 0 | 1.000 |

## Every answer that was not the exact line

- gpt-oss-120b t100k-d025-r3 (hpa): symptom line 1731 (needle 433, symptom k8s-event)
- gpt-oss-120b t025k-d075-r1 (pool): symptom line 426 (needle 319, symptom checkout-api)
- gpt-oss-120b t050k-d100-r3 (queue): symptom line 874 (needle 873, symptom checkout-api)
- gpt-oss-120b t100k-d000-r1 (queue): symptom line 1716 (needle 1, symptom checkout-api)
- gpt-oss-120b t050k-d050-r3 (hpa): decoy line 876 (needle 435,  )
- gpt-oss-120b t100k-d050-r2 (hpa): symptom line 1738 (needle 868, symptom checkout-api)
- gpt-oss-120b t010k-d075-r1 (queue): symptom line 151 (needle 113, symptom checkout-api)
- gpt-oss-120b t050k-d025-r1 (queue): symptom line 863 (needle 216, symptom checkout-api)
- gpt-oss-120b t025k-d075-r3 (hpa): symptom line 428 (needle 321, symptom k8s-event)
- gpt-oss-120b t100k-d075-r2 (redis): symptom line 1725 (needle 1293, symptom checkout-api)
- gpt-oss-120b t050k-d025-r2 (pool): component line 867 (needle 217, symptom )
- gpt-oss-120b t050k-d000-r2 (queue): symptom line 872 (needle 1, symptom checkout-api)
- gpt-oss-120b t025k-d050-r3 (cert): symptom line 420 (needle 210, symptom checkout-api)
- gpt-oss-120b t010k-d025-r3 (queue): symptom line 157 (needle 39, symptom rabbitmq)
- gpt-oss-120b t050k-d075-r3 (redis): component line 866 (needle 648, bg-post )
- gpt-oss-120b t050k-d000-r3 (pool): decoy line 879 (needle 1,  )
- gpt-oss-120b t100k-d100-r2 (queue): symptom line 1722 (needle 1721, symptom checkout-api)
- gpt-oss-120b t025k-d050-r1 (queue): symptom line 428 (needle 214, symptom checkout-api)
- gpt-oss-120b t100k-d025-r1 (pool): decoy line 1763 (needle 435,  )
- gpt-oss-120b t050k-d050-r1 (pool): symptom line 859 (needle 430, symptom checkout-api)
- gpt-oss-120b t100k-d000-r3 (cert): symptom line 1730 (needle 1, symptom checkout-api)
- gpt-oss-120b t100k-d075-r3 (queue): symptom line 1731 (needle 1298, symptom rabbitmq)
- gpt-oss-120b t025k-d000-r3 (queue): symptom line 421 (needle 1, symptom checkout-api)
- gpt-oss-120b t100k-d050-r3 (redis): decoy line 1747 (needle 864,  )
- gpt-oss-120b t010k-d050-r2 (queue): symptom line 155 (needle 78, symptom rabbitmq)
- gpt-oss-120b t025k-d025-r2 (queue): symptom line 419 (needle 105, symptom rabbitmq)
- gpt-oss-120b t010k-d075-r2 (pool): component line 154 (needle 115, symptom )
- Ministral 3 14B t025k-d025-r2 (queue): symptom line 419 (needle 105, symptom rabbitmq)
- Ministral 3 14B t010k-d050-r2 (queue): missed line 7 (needle 78, change k8s-audit)
- Ministral 3 14B t100k-d000-r1 (queue): symptom line 1716 (needle 1, symptom checkout-api)
- Ministral 3 14B t025k-d050-r1 (queue): missed line 228 (needle 214, change k8s-audit)
- Ministral 3 14B t050k-d025-r2 (pool): component line 867 (needle 217, symptom )
- Ministral 3 14B t050k-d025-r1 (queue): missed line 223 (needle 216, change k8s-audit)
- Ministral 3 14B t010k-d075-r1 (queue): missed line 145 (needle 113, change k8s-audit)
- Ministral 3 14B t100k-d100-r2 (queue): symptom line 1722 (needle 1721, symptom checkout-api)
- Ministral 3 14B t100k-d050-r2 (hpa): symptom line 1735 (needle 868, symptom k8s-event)
- Ministral 3 14B t025k-d000-r1 (hpa): component line 319 (needle 1, change )
- Ministral 3 14B t010k-d000-r2 (hpa): symptom line 154 (needle 1, symptom k8s-event)
- Ministral 3 14B t025k-d025-r3 (pool): missed line 274 (needle 107, change k8s-audit)
- Ministral 3 14B t100k-d075-r3 (queue): symptom line 1790 (needle 1298, bg-post nginx-ingress)
- Ministral 3 14B t050k-d000-r2 (queue): symptom line 872 (needle 1, symptom checkout-api)
- Ministral 3 14B t050k-d050-r1 (pool): wrong_number line 820 (needle 430,  )
- Ministral 3 14B t100k-d025-r3 (hpa): symptom line 1731 (needle 433, symptom k8s-event)
- Ministral 3 14B t010k-d025-r3 (queue): missed line 138 (needle 39, change k8s-audit)
- Ministral 3 14B t100k-d050-r3 (redis): wrong_number line 1464 (needle 864,  )
- Ministral 3 14B t100k-d025-r1 (pool): symptom line 1736 (needle 435, symptom checkout-api)
- NVIDIA Nemotron 3.5 Super VL t010k-d025-r3 (queue): invalid finish=length
- DeepSeek V4 Pro 0813 t100k-d025-r2 (cert): wrong_number line 435 (needle 436,  )

## Calls served from the prompt cache (warmed by pilot 2)

- gpt-oss-120b: none
- DeepSeek V4 Flash 0731: t050k-d000-r1 (50432 of 50768 prompt tokens), t200k-d000-r1 (203776 of 204098 prompt tokens), t100k-d000-r1 (101632 of 102119 prompt tokens), t200k-d100-r1 (205056 of 205397 prompt tokens)
- GLM-5.3 Flash: none
- Ministral 3 14B: t100k-d000-r1 (139968 of 140027 prompt tokens), t050k-d000-r1 (69568 of 69605 prompt tokens)
- NVIDIA Nemotron 3.5 Super VL: t050k-d000-r1 (66560 of 69616 prompt tokens)
- DeepSeek V4 Pro 0813: t100k-d000-r1 (101888 of 102119 prompt tokens)

## Retries

- gpt-oss-120b: 0 calls needed a retry; attempt statuses {"200":60}; finish {"stop":60}
- DeepSeek V4 Flash 0731: 0 calls needed a retry; attempt statuses {"200":75}; finish {"stop":75}
- GLM-5.3 Flash: 25 calls needed a retry; attempt statuses {"200":75,"529":37}; finish {"stop":75}
- Ministral 3 14B: 0 calls needed a retry; attempt statuses {"200":60}; finish {"stop":60}
- NVIDIA Nemotron 3.5 Super VL: 0 calls needed a retry; attempt statuses {"200":45}; finish {"stop":44,"length":1}
- DeepSeek V4 Pro 0813: 0 calls needed a retry; attempt statuses {"200":50}; finish {"stop":50}
