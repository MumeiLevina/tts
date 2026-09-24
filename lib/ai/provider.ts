import type { AIStylistInput, ProductStylingMetadata } from "../outfit/types";

export type AIProviderRequest = {
  input: AIStylistInput;
  candidates: ProductStylingMetadata[];
  instructions: string;
  schemaName: string;
  responseSchema: Record<string, unknown>;
  maxOutputTokens?: number;
};

export type AIProviderResult = {
  provider: string;
  model: string;
  requestId?: string;
  data: unknown;
};

export interface AIProvider {
  readonly name: string;
  generate(request: AIProviderRequest): Promise<AIProviderResult>;
}

export class AIProviderError extends Error {
  constructor(public code: "NOT_CONFIGURED" | "TIMEOUT" | "CONNECTION" | "PROVIDER_ERROR" | "INVALID_RESPONSE", message: string, public status?: number) {
    super(message);
    this.name = "AIProviderError";
  }
}
