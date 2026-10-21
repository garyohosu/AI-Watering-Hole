/** Heuristic only: User-Agent can be spoofed. No assertion of visitor identity. */
export function classifyAgent(userAgent: string): string {
  const ua=userAgent.toLowerCase();
  const signatures: Array<[string,string]> = [
    ["oai-searchbot","openai-search"],["chatgpt-user","openai-user"],["gptbot","openai-training"],
    ["claudebot","anthropic-crawler"],["claude-user","anthropic-user"],["claude-searchbot","anthropic-search"],
    ["googlebot","google-search"],["googleother","google-other"],["google-cloudvertexbot","google-vertex"],
    ["bingbot","bing-search"],["perplexitybot","perplexity-crawler"],["perplexity-user","perplexity-user"],
    ["bytespider","bytedance-crawler"],["cohere-ai","cohere-crawler"],["amazonbot","amazon-crawler"],
    ["facebookexternalhit","meta-link-preview"],["meta-externalagent","meta-crawler"],
    ["applebot-extended","apple-ai-control"],["applebot","apple-search"],
    ["duckduckbot","duckduckgo-search"]
  ];
  for (const [needle,category] of signatures) if(ua.includes(needle)) return category;
  if(/bot|crawler|spider|fetcher/.test(ua)) return "other-bot";
  return ua ? "unknown-client" : "missing-user-agent";
}
