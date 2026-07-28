import type { Edition } from '@morning-brief/shared';

/**
 * Offline development fixture.
 *
 * A real edition captured from the pipeline and trimmed, so the layout is
 * exercised against the shape and length of text it will actually receive.
 * Shown only when the API is unreachable, and the masthead says so.
 */
export const MOCK_EDITION: Edition = {
  "date": "2026-07-28",
  "generatedAt": "2026-07-28T13:52:11.213Z",
  "status": "live",
  "degraded": [
    "fixture:offline development sample"
  ],
  "frontPage": [
    {
      "id": "d3d8xt",
      "headline": "OpenAI called the Hugging Face attack unprecedented. But we’ve been here before.",
      "summary": "Reading OpenAI’s account last week of how some of its models broke their containment and hacked into the computer systems of Hugging Face , another AI company, was the first time I got genuine chills about what large language models are now able to do. But this is a case of human hubris, not rogue AI. I am not an alarmist.",
      "whyItMatters": "3 outlets are carrying this Artificial Intelligence story so far.",
      "category": "ai",
      "region": "global",
      "sources": [
        {
          "name": "TechCrunch",
          "url": "https://techcrunch.com/2026/07/26/hugging-face-ceo-calls-for-radical-transparency-after-unprecedented-openai-hack"
        },
        {
          "name": "MIT Technology Review",
          "url": "https://technologyreview.com/2026/07/27/1140836/openai-hugging-face-attack-precedent"
        },
        {
          "name": "The Hacker News",
          "url": "https://thehackernews.com/2026/07/jfrog-confirms-openai-models-exploited.html"
        }
      ],
      "articleCount": 3,
      "publishedAt": "2026-07-28T13:33:47.000Z",
      "score": 0.8891,
      "aiGenerated": false
    },
    {
      "id": "xhkj8j",
      "headline": "Brookfield raises $2bn for PIF-anchored Middle East private equity fund",
      "summary": "Brookfield has raised about $2 billion from the Public Investment Fund and other investors for a private equity fund that will invest in companies in the Middle East, Saudi Arabia 's sovereign wealth fund said on Monday. The PIF -anchored Brookfield Middle East Partners aims to allocate half of its investments to Saudi Arabia, it said.",
      "whyItMatters": "5 independent outlets are carrying this, among the most widely corroborated Saudi Arabia stories of the morning.",
      "category": "saudi",
      "region": "saudi",
      "sources": [
        {
          "name": "The National",
          "url": "https://thenationalnews.com/business/2026/07/27/brookfield-raises-2bn-for-pif-anchored-middle-east-private-equity-fund"
        },
        {
          "name": "Arab News",
          "url": "https://news.google.com/rss/articles/CBMiU0FVX3lxTFBSZUNEX3B3X29EUGhDQ05GUHJjczJETFhIb2c4cEZWR0RpNFRWZ2ZsdnRGczJPZmhHSFlHUnRxZUdUQ2gxLUFweVdCbVVHYUV1ZTVR?oc=5"
        },
        {
          "name": "Pulse 2.0",
          "url": "https://news.google.com/rss/articles/CBMiowFBVV95cUxOU3dZcmV3SEowc21RNlBiSTR1eTNTRFRxbmZBdFV0ZU40MGRqMG5xUXRuOTNjbjJrQkZRdzdIcGFLb0hGY3B6TUt4ejFXRHpCOU96b194TXgwa3NWREJVNDNicnFlMWlvSHJTZGRYZVJibUVZRk9lRVZBWmVqbXVkS2wwQk9QNGZiOGVQeUtQT0prd0NBODcxaTdybE9rVVdHdzZn0gGoAUFVX3lxTE1mZk5OMXZxOFRJei1qS0M4WGZoMmx4RGNRdnpQaEJFQ3NKbm1GaUZBdFUxbEJjYXphc2l0b0gwdHRoV28xYkV5MWVjTUExTmRqQ1RmWFJwOG41ZzJoR2xIZ3FVQUlPSGtnUV91c2x6NmVZYnJ6TUh5SUtGNnlRUzhobkRHT0V6aGxwd2Z4aEppLVhUNzY3czc0QUdMckdzaTY1SHBsbmxnMw?oc=5"
        },
        {
          "name": "IndexBox",
          "url": "https://news.google.com/rss/articles/CBMiqgFBVV95cUxPV3p3blZtUXdJMDNIQmJQdVAzLU1hQUp0WEhMTjg3d1pxU0dtdUNnR09GYWlrbC13M2ptS2ZtNWJuOGk4U21kM19zZmRsSkxteUpEcVdLU3k2RG9oMVlqejQzdF9aM3Y4emJvMU0xOWlUUGVMN283dGl3eGlCVktGNUNlQkRqWkRrT0NNTkp5VWFFcjZHeVRSSmUwYUVaeWljdTNuZWhsZEwwZw?oc=5"
        },
        {
          "name": "Briefs Finance",
          "url": "https://news.google.com/rss/articles/CBMikgFBVV95cUxQMkZ2VkctZGFFZl9GVUxkXzdhU3BMTkdKcWJ3a1JKRzhScmhsam55dkRINlJSQ0t4aWVOQXdGMW4xRWFGYjRwUFl4Vnc1N2VIbkJEWFh4ZEs0eUdYbWdlYWVVN3dRdGRMSzZvQ01lLWd1RTZFNXhqdmYtLTk3bWUzc3dPNU1RRHhMZzRlWEw1aFBpdw?oc=5"
        }
      ],
      "articleCount": 5,
      "publishedAt": "2026-07-28T11:21:15.000Z",
      "score": 0.8861,
      "aiGenerated": false
    },
    {
      "id": "z478o8",
      "headline": "Nvidia employee detained in Taiwan as part of chip smuggling probe — held on suspicion of falsifying business documents, company says smuggling 'a nonstarter'",
      "summary": "Taiwan's Keelung District Prosecutors' Office said on Tuesday it has detained a man surnamed Chang on suspicion of falsifying business documents, after investigators searched his home and his workplace on July 24 in connection with the AI chip smuggling case it opened in May.",
      "whyItMatters": "3 outlets are carrying this Artificial Intelligence story so far.",
      "category": "ai",
      "region": "global",
      "sources": [
        {
          "name": "Tom's Hardware",
          "url": "https://tomshardware.com/tech-industry/nvidias-taipei-office-searched-as-taiwan-detains-employee-in-ai-chip-smuggling-probe"
        },
        {
          "name": "Reuters",
          "url": "https://news.google.com/rss/articles/CBMivgFBVV95cUxONGVEdUMzN3M0bDF4c0UtSW42SlAzeWoydnpubGFaeDgtQnYzRmwyMjlyWU4yOFJqUU1Pd3R4Q1pwLWVPZkhCU3Z6QkZoMktUX1BIQm0wY0MteXpwSWFmWl9Xa2FBUmpJYl9SeUt3M1g4MlViU2xUMThtQ1paa3dLal9scVhKbnhMX0FnYnJUdURWUTVvQUIxcFNHRnRsdTFlNmRKVnVnWHV5SkdoeE1sZ1lLTUpvajNDNTVLOC13?oc=5"
        },
        {
          "name": "Bloomberg",
          "url": "https://news.google.com/rss/articles/CBMisAFBVV95cUxPaUtDQjNDTzYxbGFhVXNfOFVCcFFLZnZyc2hoUTdjdkpPVU1FeG9VVnNvVEhXTTVEV050OXprbnZoX3FMangzWFV3U1owR2QwT01LenFLNGZQRjB1MS1XM2NlTlpvd2lHZjU1aGIydmpiZ3BXQWJwd1NJVk9BcTdRVVZYcGtoNVA2RzlHU3VXLW93VVd5SF9tdWxxNm5jb05BSGZMT0lORTF5bnhab09URw?oc=5"
        }
      ],
      "articleCount": 3,
      "publishedAt": "2026-07-28T10:39:15.000Z",
      "score": 0.8681,
      "aiGenerated": false
    }
  ],
  "sections": {
    "ai": [
      {
        "id": "1ji2a25",
        "headline": "Microsoft Says New Cybersecurity AI Model Helps MDASH Score 95.95% at Half the Cost",
        "summary": "Microsoft has launched its first cybersecurity-specific model inside MDASH, its multi-model vulnerability identification and remediation harness. The company says MDASH, using MAI-Cyber-1-Flash and GPT-5.4, scored 95.95% on CyberGym. It also claims the configuration costs 50% less than its current best MDASH combination of GPT-5.4, GPT-5.4 mini, and GPT-5.3 Codex.",
        "whyItMatters": "3 outlets are carrying this Artificial Intelligence story so far.",
        "category": "ai",
        "region": "global",
        "sources": [
          {
            "name": "CNBC",
            "url": "https://cnbc.com/2026/07/27/microsoft-touts-cost-saving-ai-model-for-cybersecurity.html"
          },
          {
            "name": "The Hacker News",
            "url": "https://thehackernews.com/2026/07/microsoft-says-new-cybersecurity-ai.html"
          },
          {
            "name": "SecurityWeek",
            "url": "https://securityweek.com/microsoft-unveils-mai-cyber-1-flash-its-first-cybersecurity-ai-model"
          }
        ],
        "articleCount": 3,
        "publishedAt": "2026-07-28T11:11:48.000Z",
        "score": 0.859,
        "aiGenerated": false
      },
      {
        "id": "wuf50l",
        "headline": "AMD signs AI data center deal with Core Scientific",
        "summary": "AMD signs AI data center deal with Core Scientific",
        "whyItMatters": "Two outlets are carrying this Artificial Intelligence story so far.",
        "category": "ai",
        "region": "global",
        "sources": [
          {
            "name": "CryptoProwl",
            "url": "https://finance.yahoo.com/technology/ai/articles/core-scientific-partners-chipmaker-amd-132600527.html"
          },
          {
            "name": "Reuters",
            "url": "https://news.google.com/rss/articles/CBMinwFBVV95cUxQWnFiRjVManVtR3hxSVQ2N1Z0eF94RHl3aEVmQVY2emcwTVBDRHphZVBEUzlFSkRhaWI5X3hsa2Z3VGlNa2FyNF9ERjAwemFfWURDTFowUkV6MGhydVdNVFFNMUl3TUk4NGZ4UnRXdll6ZEVEOWpXNUpQZF9XNUQwWkxvemlqZHh2S3RhRE9EZFRPUm5IeUo0b0wySV9Falk?oc=5"
          }
        ],
        "articleCount": 2,
        "publishedAt": "2026-07-28T13:26:00.000Z",
        "score": 0.8461,
        "aiGenerated": false
      }
    ],
    "saudi": [
      {
        "id": "1mwwg4g",
        "headline": "Heritage Commission uncovers 55 violations targeting Saudi archaeological sites",
        "summary": "RIYADH — The Heritage Commission recorded 55 violations involving cultural heritage sites and artifacts across several regions of the Kingdom during the second quarter of 2026. The cases were identified as part of the commission's ongoing efforts to protect archaeological and heritage sites, preserve their historical features, and strengthen compliance with regulationsgoverning the sector.",
        "whyItMatters": "Two outlets are carrying this Saudi Arabia story so far.",
        "category": "saudi",
        "region": "saudi",
        "sources": [
          {
            "name": "Saudi Gazette",
            "url": "https://saudigazette.com.sa/article/663306/saudi-arabia/heritage-commission-uncovers-55-violations-targeting-saudi-archaeological-sites"
          },
          {
            "name": "Saudi Press Agency",
            "url": "https://news.google.com/rss/articles/CBMiSkFVX3lxTE41X0FXTV9hajRrTXJyQlZNT25QNkVUU1lFYXNfWUtkQVlTNlg5RWk2QW92MGVqbEpNa3pBX1JpSW1XdV9JVi16TVNR?oc=5"
          }
        ],
        "articleCount": 2,
        "publishedAt": "2026-07-28T11:04:49.000Z",
        "score": 0.7901,
        "aiGenerated": false
      },
      {
        "id": "1u0vtk9",
        "headline": "Growth Catalyst Fund I secures first commitment from Jada Fund of Funds",
        "summary": "Saudi Arabia's Jada Fund of Funds, owned by the Public Investment Fund (PIF), has made its first commitment to Growth Catalyst Fund I, a private equity fund targeting $200 million to invest in growth-stage Saudi SMEs. Jada did not disclose the size of its commitment.",
        "whyItMatters": "Two outlets are carrying this Saudi Arabia story so far.",
        "category": "saudi",
        "region": "middleEast",
        "sources": [
          {
            "name": "Wamda",
            "url": "https://wamda.com/2026/07/growth-catalyst-fund-i-secures-commitment-jada-fund-funds"
          },
          {
            "name": "Arab News",
            "url": "https://news.google.com/rss/articles/CBMiU0FVX3lxTFBnT0drZ29vU0w3ODRNVU9HMlhsN1NIRnAtTkVoVllKbDlHWFhoWk1HYjRQbHVlVkU0RmNPQVk3Q05weGhxWkUwRTE2a3NCQldKVnBN?oc=5"
          }
        ],
        "articleCount": 2,
        "publishedAt": "2026-07-28T10:42:39.000Z",
        "score": 0.779,
        "aiGenerated": false
      }
    ],
    "middleEast": [
      {
        "id": "4ge362",
        "headline": "Oman presented regional mechanism for Hormuz to Iran, source says",
        "summary": "By Timour Azhari RIYADH, July 28 (Reuters) - Oman has presented a proposal to Iran for a joint regional mechanism to manage the Strait of Hormuz with voluntary fees, a Gulf source told Reuters on Tuesday. Under the Omani proposal, which has regional backing and was presented to Iranian officials over the weekend in Tehran, Iran would not exercise sole control of the vital waterway, the source added.",
        "whyItMatters": "3 outlets are carrying this Middle East story so far.",
        "category": "middleEast",
        "region": "middleEast",
        "sources": [
          {
            "name": "Al-Monitor",
            "url": "https://al-monitor.com/originals/2026/07/oman-presented-regional-mechanism-hormuz-iran-source-says"
          },
          {
            "name": "Al Arabiya English",
            "url": "https://news.google.com/rss/articles/CBMi5gFBVV95cUxPTkZjRl9jSmpUb2JFbHhmYkxieWlQNnQ0MW16NEE2RUlMaHRmUjE4NkY1YWR6QjhRRU5UZmhRUVVOc0ptY0tfM2RTNkdLVkJQLS1vR01XSjc5bHVFQUJOS3BuMkhTUEhLZWhsNzNsdHRxOXBlNTAyc2ZGMGs0dWhLS3BuMUV0X3VNOEpuUENLR1pMOXRtanUxWFM2cXZjSjVjVUI0QjVMbzcwaUJNQ1dNTmEyX0xMbWpKbUM4MmRuSEhiNjNPb1BKVXBKNjZta2xMaDRvMlZxdS1Bc1Ewa1FrVG5vY3FXUdIB5gFBVV95cUxPTkZjRl9jSmpUb2JFbHhmYkxieWlQNnQ0MW16NEE2RUlMaHRmUjE4NkY1YWR6QjhRRU5UZmhRUVVOc0ptY0tfM2RTNkdLVkJQLS1vR01XSjc5bHVFQUJOS3BuMkhTUEhLZWhsNzNsdHRxOXBlNTAyc2ZGMGs0dWhLS3BuMUV0X3VNOEpuUENLR1pMOXRtanUxWFM2cXZjSjVjVUI0QjVMbzcwaUJNQ1dNTmEyX0xMbWpKbUM4MmRuSEhiNjNPb1BKVXBKNjZta2xMaDRvMlZxdS1Bc1Ewa1FrVG5vY3FXUQ?oc=5"
          },
          {
            "name": "Reuters",
            "url": "https://news.google.com/rss/articles/CBMisAFBVV95cUxNRFRBNlNicGc0ZnNMeVJWaGRJRjhNNEh6eUpSSHBFcXRGcW5iTkZYbV90Skg4VU5rQ0IwZjRkcmc2YVJxTzVIeFVfU2twSXlnQThKdXhmcURGM3FlakJQVHFwQ2hFdHVlN3Fqd1BMNWVTNVUyYktnTlp5aDg4N0NFWVlIVXp2YUg3bjM4V0RnUjNRYnhOT3Nvdmp1T2FlTUYzYzBzcmNQckZWc0hWOXpNag?oc=5"
          }
        ],
        "articleCount": 3,
        "publishedAt": "2026-07-28T11:16:21.000Z",
        "score": 0.7823,
        "aiGenerated": false
      },
      {
        "id": "yiw7g8",
        "headline": "Palestinian woman loses unborn child after Israeli forces stop ambulance at Nablus checkpoint",
        "summary": "A critically ill pregnant woman lost her unborn child after Israeli forces stopped the ambulance taking her to hospital in the Palestinian city of Nablus, in the occupied West Bank , state news agency Wafa reported.",
        "whyItMatters": "Two outlets are carrying this Middle East story so far.",
        "category": "middleEast",
        "region": "middleEast",
        "sources": [
          {
            "name": "The National",
            "url": "https://thenationalnews.com/news/mena/2026/07/27/palestinian-woman-loses-unborn-child-after-israeli-forces-stop-ambulance-at-nablus-checkpoint"
          },
          {
            "name": "Al Jazeera",
            "url": "https://aljazeera.com/video/newsfeed/2026/7/28/pregnant-palestinian-woman-loses-baby-after-israeli-checkpoint-stop?traffic_source=rss"
          }
        ],
        "articleCount": 2,
        "publishedAt": "2026-07-28T13:02:50.000Z",
        "score": 0.7556,
        "aiGenerated": false
      }
    ],
    "usWorld": [
      {
        "id": "1gdidpy",
        "headline": "Tsunami warning after powerful earthquake hits southern Japan",
        "summary": "An earthquake with a preliminary magnitude of 7.1 struck Japan's southern Kumamoto prefecture on Tuesday, knocking out power to thousands of homes, stopping rail services and triggering warnings of tsunamis and aftershocks. The Japanese government issued emergency earthquake warnings for Kumamoto, Nagasaki, Kagoshima, Fukuoka, Saga, Oita and Miyazaki prefectures, all on Japan's southern Kyushu island.",
        "whyItMatters": "8 independent outlets are carrying this, among the most widely corroborated World stories of the morning.",
        "category": "global",
        "region": "global",
        "sources": [
          {
            "name": "The National",
            "url": "https://thenationalnews.com/news/asia/2026/07/28/tsunami-warning-after-powerful-earthquake-hits-southern-japan"
          },
          {
            "name": "Al Jazeera",
            "url": "https://aljazeera.com/video/newsfeed/2026/7/28/moment-7-1-magnitude-earthquake-rocks-southern-japan?traffic_source=rss"
          },
          {
            "name": "The Times of Israel",
            "url": "https://timesofisrael.com/powerful-quake-hits-southern-japan-with-deaths-feared-in-shopping-mall-explosion"
          },
          {
            "name": "NPR",
            "url": "https://npr.org/2026/07/28/nx-s1-5910498/japan-earthquake"
          },
          {
            "name": "CNBC",
            "url": "https://cnbc.com/2026/07/28/major-quake-in-southern-japan-knocks-out-power-disrupts-transport.html"
          },
          {
            "name": "Al Arabiya English",
            "url": "https://news.google.com/rss/articles/CBMikgFBVV95cUxPYUkyY0JCLUJBRkN2c3drRkgzVWZ3a3R0dUYxOVlqOWV0emdtbnBNMDJ6Z3g5cUJCUHo3NmtaSHBLamxGRzNOTnpVSWtQVnJDU2hHZUVZRE9rUXVuN3pEWDFOTzJkRGdDQ013NHd2M2R3ZWNDQkRTY3l1VE45YUlUWWpUdnZ1UF9uOXR0YkljSVJ5Z9IBkgFBVV95cUxPYUkyY0JCLUJBRkN2c3drRkgzVWZ3a3R0dUYxOVlqOWV0emdtbnBNMDJ6Z3g5cUJCUHo3NmtaSHBLamxGRzNOTnpVSWtQVnJDU2hHZUVZRE9rUXVuN3pEWDFOTzJkRGdDQ013NHd2M2R3ZWNDQkRTY3l1VE45YUlUWWpUdnZ1UF9uOXR0YkljSVJ5Zw?oc=5"
          }
        ],
        "articleCount": 8,
        "publishedAt": "2026-07-28T13:47:21.000Z",
        "score": 0.7575,
        "aiGenerated": false
      }
    ]
  },
  "markets": {
    "quotes": [
      {
        "symbol": "TASI",
        "label": "TASI",
        "value": 10678.11,
        "changePercent": -0.85,
        "direction": "down",
        "currency": "SAR",
        "asOf": "2026-07-28T12:19:59.000Z"
      },
      {
        "symbol": "SPX",
        "label": "S&P 500",
        "value": 7395.03,
        "changePercent": -0.24,
        "direction": "down",
        "currency": "USD",
        "asOf": "2026-07-28T13:52:11.000Z"
      },
      {
        "symbol": "IXIC",
        "label": "Nasdaq",
        "value": 24662.438,
        "changePercent": -1.08,
        "direction": "down",
        "currency": "USD",
        "asOf": "2026-07-28T13:52:10.000Z"
      },
      {
        "symbol": "DJI",
        "label": "Dow Jones",
        "value": 52531.43,
        "changePercent": 0.62,
        "direction": "up",
        "currency": "USD",
        "asOf": "2026-07-28T13:52:10.000Z"
      },
      {
        "symbol": "BTC",
        "label": "Bitcoin",
        "value": 62946.52,
        "changePercent": -1.22,
        "direction": "down",
        "currency": "USD",
        "asOf": "2026-07-28T13:52:08.000Z"
      },
      {
        "symbol": "BRENT",
        "label": "Brent Crude",
        "value": 86.16,
        "changePercent": -2.49,
        "direction": "down",
        "currency": "USD",
        "asOf": "2026-07-28T13:42:02.000Z"
      },
      {
        "symbol": "WTI",
        "label": "WTI Crude",
        "value": 80.89,
        "changePercent": -2.08,
        "direction": "down",
        "currency": "USD",
        "asOf": "2026-07-28T13:42:11.000Z"
      },
      {
        "symbol": "GOLD",
        "label": "Gold",
        "value": 4023,
        "changePercent": -1.26,
        "direction": "down",
        "currency": "USD",
        "asOf": "2026-07-28T13:42:11.000Z"
      },
      {
        "symbol": "USDSAR",
        "label": "USD/SAR",
        "value": 3.7539,
        "changePercent": null,
        "direction": "unknown",
        "currency": "SAR",
        "asOf": "2026-07-28T13:50:43.000Z"
      }
    ],
    "aiSummary": "Brent Crude down 2.49% to 86.16, WTI Crude down 2.08% to 80.89, Gold down 1.26% to 4,023. Declines outnumber gains across the board.",
    "asOf": "2026-07-28T13:52:11.213Z",
    "stale": false
  },
  "watchToday": [
    {
      "id": "yjcpmn",
      "title": "Bar to Fed rate hike this week remains high even as markets see a chance",
      "kind": "centralBank",
      "when": "This week",
      "sourceUrl": "https://news.google.com/rss/articles/CBMirgFBVV95cUxNRE5uc1NXMlVkdDgwWjJzNVpnMTRMUFlyUllXQk82SXRTWXRiT1NYdmhZc2hLMWRoZDZvT1ZudFU0V2NobWYxWXMxNTFYeFByakoyTVc2cHVzUGljb254a285MnZaeGN4LVIzRWhJQTcxdHIwMUxzYkZfNUMwUHFDMDlONFVlUldtc0Zxa1FHMGg0ZGU3RktDT0JueWRZU2xoY2h5YzYtTGg1M2pwNUE?oc=5"
    },
    {
      "id": "5ma4h3",
      "title": "Iran war escalation puts Federal Reserve in a bind",
      "kind": "centralBank",
      "when": "This week",
      "sourceUrl": "https://thenationalnews.com/business/economy/2026/07/27/iran-war-escalation-puts-federal-reserve-in-a-bind"
    },
    {
      "id": "am2zyx",
      "title": "Nasdaq opens lower as AI worries mount ahead of pivotal earnings",
      "kind": "earnings",
      "when": "Ahead",
      "sourceUrl": "https://news.google.com/rss/articles/CBMipgFBVV95cUxPNkhJQS14Y3d3QkMxeG5XZmR3cldUel9CSk9pdDZrSDFkc0gydEgxSXQ1d0xzTi1OR29xVWEwUjJtV1k4V1p3WlZJeUZCbnB2MzJOYjBHRExWTmVobWlibGFqajlUcWx5emx2M01vYmNwcHlDM2FvYjRwU3o2M0szNVpyM3JwakJyRkZReUMyVk5GUklTWWczOXdFSUcwNkh1clFNVWJn?oc=5"
    }
  ]
};
