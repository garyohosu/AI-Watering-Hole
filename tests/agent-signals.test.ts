import {describe,it,expect} from "vitest";
import {classifyAgent} from "../src/agent-signals";
describe("Unverified user-agent signatures",()=>{
 it("distinguishes OpenAI search and interactive retrieval",()=>{
  expect(classifyAgent("OAI-SearchBot/1.0")).toBe("openai-search");
  expect(classifyAgent("ChatGPT-User/1.0")).toBe("openai-user");
  expect(classifyAgent("GPTBot/1.0")).toBe("openai-training");
 });
 it("distinguishes providers and generic crawlers",()=>{
  expect(classifyAgent("ClaudeBot")).toBe("anthropic-crawler");
  expect(classifyAgent("Googlebot/2.1")).toBe("google-search");
  expect(classifyAgent("Perplexity-User")).toBe("perplexity-user");
  expect(classifyAgent("example-spider")).toBe("other-bot");
  expect(classifyAgent("Mozilla/5.0")).toBe("unknown-client");
 });
});
