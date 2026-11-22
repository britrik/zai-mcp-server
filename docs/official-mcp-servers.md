# Official Z.ai MCP servers

Adopt the official servers alongside this custom server (oss-radar #37).
Custom tools are not being retired yet.

## Services and tools

| Server | Tools | Endpoint / launch |
| --- | --- | --- |
| Web Search | `webSearchPrime` | `https://api.z.ai/api/mcp/web_search_prime/mcp` |
| Web Reader | `webReader` | `https://api.z.ai/api/mcp/web_reader/mcp` |
| Zread | `search_doc`, `get_repo_structure`, `read_file` | `https://api.z.ai/api/mcp/zread/mcp` |
| Local vision | See below | `npx -y @z_ai/mcp-server@0.1.6` |

The published vision package **0.1.6** registers these tools:

- `ui_to_artifact`: convert UI screenshots into code, prompts, specs or descriptions.
- `extract_text_from_screenshot`: OCR screenshot text.
- `diagnose_error_screenshot`: diagnose errors shown in screenshots.
- `understand_technical_diagram`: interpret architecture and other diagrams.
- `analyze_data_visualization`: interpret charts and dashboards.
- `ui_diff_check`: compare UI screenshots.
- `analyze_image`: general image analysis.
- `analyze_video`: video analysis.

The official vision documentation instead calls the last two `image_analysis`
and `video_analysis`. Use the actual tool names exposed by your installed version;
the names above were checked against the published 0.1.6 package.

## Client configuration

Use **Streamable HTTP** for the remote servers and an
`Authorization: Bearer <Coding Plan API key>` header. Do **not** use the legacy
SSE `?Authorization=` URL form: credentials in URLs can leak through logs and
history. The following Claude Code-style `mcpServers` configuration adds the
official servers without replacing your existing custom-server entry. Client
configuration formats vary; use a client that supports Streamable HTTP.

```json
{
  "mcpServers": {
    "official-zai-search": {
      "type": "http",
      "url": "https://api.z.ai/api/mcp/web_search_prime/mcp",
      "headers": { "Authorization": "Bearer <CODING_PLAN_API_KEY>" }
    },
    "official-zai-reader": {
      "type": "http",
      "url": "https://api.z.ai/api/mcp/web_reader/mcp",
      "headers": { "Authorization": "Bearer <CODING_PLAN_API_KEY>" }
    },
    "official-zai-zread": {
      "type": "http",
      "url": "https://api.z.ai/api/mcp/zread/mcp",
      "headers": { "Authorization": "Bearer <CODING_PLAN_API_KEY>" }
    },
    "official-zai-vision": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@z_ai/mcp-server@0.1.6"],
      "env": {
        "Z_AI_API_KEY": "<CODING_PLAN_API_KEY>",
        "Z_AI_MODE": "ZAI"
      }
    }
  }
}
```

Vision requires **Node >=22 per the official docs**, although package metadata
declares >=18. Its environment names (`Z_AI_API_KEY`, `Z_AI_MODE`) differ from
this custom server's `ZAI_*` configuration. Keep real keys out of source control;
use your client's secure configuration mechanism.

## Coverage

| Custom tool | Official equivalent | Compatibility |
| --- | --- | --- |
| `zai_search` | `webSearchPrime` | Functional web-search equivalent, not drop-in: tool name, arguments and results differ; custom search describes semantic indexed search. |
| `zai_chat` | Not covered | No generic text-chat tool in these official MCP servers. |
| `zai_summarize` | Not covered | No arbitrary-text summarization tool; `webReader` retrieves pages rather than replacing summarization. |

## Access, cost and privacy

- These MCP services are **GLM Coding Plan only**, available across plan tiers.
  Use a **Coding Plan key**, not a standard API key: obtain it from Personal
  Coding Plan or Team Coding Plan → My Plan. A paid standard API account alone
  does not establish MCP entitlement. Follow the supported-client usage policy.
- Current documented Web Search, Web Reader and Zread costs are **1.2 credits
  per call**, deducted from plan credits. Vision uses model/token-based credit
  accounting, not the flat remote-tool rate. Quotas and pricing can change;
  check the current plan documentation before rollout.
- Remote servers are proprietary hosted services: availability, access policy
  and pricing remain dependencies on Z.ai. No open-source implementation
  license is stated for these remote services. The local npm package declares
  **Apache-2.0**, which does not license the hosted services.
- Queries, URLs and other remote tool inputs go to Z.ai. **Do not send private
  payloads to remote search/reader**, including secrets, confidential text,
  internal URLs or token-bearing links. Zread is intended for public repositories.
  Local vision transport does not mean offline inference: selected images/video
  content are sent to Z.ai for analysis.

## Rollout

1. Keep custom search enabled and run official search alongside it for about
   **one month**. Compare relevance, reliability, latency, privacy suitability
   and credit consumption using non-sensitive queries.
2. Optionally set `ZAI_DISABLE_CUSTOM_SEARCH=true` on the custom server and
   restart/redeploy to hide `zai_search` and reject stale calls with guidance
   toward official `webSearchPrime`. It defaults to off; unset it or set it to
   `false` and restart/redeploy to restore custom search.
3. After the comparison, decide whether to retire `zai_search` in a separate
   change. Keep `zai_chat` and `zai_summarize` until replacements are evaluated.

This rollout does not repair the existing Netlify SSE `handleRequest` bug in
the custom server. The official remote services are configured independently.

## Sources

- [Web Search MCP](https://docs.z.ai/devpack/mcp/search-mcp-server)
- [Web Reader MCP](https://docs.z.ai/devpack/mcp/reader-mcp-server)
- [Zread MCP](https://docs.z.ai/devpack/mcp/zread-mcp-server)
- [Vision MCP, environment and Node requirements](https://docs.z.ai/devpack/mcp/vision-mcp-server)
- [Official npm package and license](https://www.npmjs.com/package/@z_ai/mcp-server)
- [Published 0.1.6 artifact (actual tool registrations)](https://registry.npmjs.org/@z_ai/mcp-server/-/mcp-server-0.1.6.tgz)
- [Plan access and credit pricing](https://docs.z.ai/devpack/overview)
- [MCP entitlement FAQ](https://docs.z.ai/devpack/faq)
- [API key types](https://docs.z.ai/devpack/notice/api-key-management)
- [Usage policy](https://docs.z.ai/devpack/usage-policy)
