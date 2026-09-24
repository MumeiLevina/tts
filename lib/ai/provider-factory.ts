import { AIProvider, AIProviderError } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";

export function createAIProvider(environment: Readonly<Record<string, string | undefined>> = process.env): AIProvider {
  const configured = (environment.AI_STYLIST_MOCK === "true" ? "mock" : environment.AI_PROVIDER || "openai").trim().toLowerCase();
  if (configured === "mock") return new MockAIProvider();
  if (configured === "openai") return new OpenAIProvider({ apiKey: environment.OPENAI_API_KEY, model: environment.OPENAI_STYLIST_MODEL });
  throw new AIProviderError("NOT_CONFIGURED", `AI provider không được hỗ trợ: ${configured}.`);
}
