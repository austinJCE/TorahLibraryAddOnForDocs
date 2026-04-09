Merkaz AI Gateway V3

Contents
- plugin/merkaz-ai-gateway : WordPress plugin
- addon : Updated full Google Docs add-on source

Apps Script Script Properties
- MERKAZ_AI_BASE_URL = https://the-merkaz.org/wp-json/merkaz-ai/v1
- MERKAZ_AI_KEY_ID = google-docs-addon
- MERKAZ_AI_SHARED_SECRET = <same shared secret configured in the WordPress plugin>

What changed in V3
- Basic / Advanced AI lesson modal
- Dynamic bootstrap config from WordPress
- Server-side cooldown enforcement plus client countdown display
- Default route orchestration modes: single, proposal_refine, multi_merge
- Prompt templates managed in WordPress
- Nonce + timestamp replay protection
- Request logging with provider/model/mode/user hash/latency/tokens
- Help document includes a policy note for API keys and AI review
