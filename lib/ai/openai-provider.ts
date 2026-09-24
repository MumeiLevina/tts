import { AIProvider, AIProviderError, AIProviderRequest, AIProviderResult } from "./provider";

type Fetch = typeof fetch;

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  return output.flatMap(item => item && typeof item === "object" && Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [])
    .filter(item => item && typeof item === "object" && (item as { type?: unknown }).type === "output_text" && typeof (item as { text?: unknown }).text === "string")
    .map(item => (item as { text: string }).text).join("");
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  constructor(private readonly options: { apiKey?: string; model?: string; fetch?: Fetch; timeoutMs?: number } = {}) {}

  async generate(request: AIProviderRequest): Promise<AIProviderResult> {
    const apiKey = this.options.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new AIProviderError("NOT_CONFIGURED", "OpenAI chưa được cấu hình.");
    const model = this.options.model || process.env.OPENAI_STYLIST_MODEL || "gpt-4.1-mini";
    const fetcher = this.options.fetch || fetch;
    let response: Response;
    try {
      response = await fetcher("https://api.openai.com/v1/responses", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.options.timeoutMs || 45000),
        body: JSON.stringify({
          model, store: false, max_output_tokens: request.maxOutputTokens || 3000,
          instructions: request.instructions,
          input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify({ request: request.input.request, numberOfOutfits: request.input.numberOfOutfits, context: request.input.context, preferredProductIds: request.input.preferredProductIds || [], products: request.candidates }) }] }],
          text: { format: { type: "json_schema", name: request.schemaName, strict: true, schema: request.responseSchema } }
        })
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new AIProviderError("TIMEOUT", "AI Stylist phản hồi quá thời gian cho phép.");
      throw new AIProviderError("CONNECTION", "Không thể kết nối AI Stylist.");
    }
    if (!response.ok) throw new AIProviderError("PROVIDER_ERROR", "Nhà cung cấp AI không xử lý được yêu cầu.", response.status);
    let payload: unknown;
    try { payload = await response.json(); }
    catch { throw new AIProviderError("INVALID_RESPONSE", "Nhà cung cấp AI trả phản hồi không đọc được."); }
    const record = payload && typeof payload === "object" ? payload as { id?: unknown; status?: unknown } : {};
    if (record.status !== "completed") throw new AIProviderError("INVALID_RESPONSE", "AI Stylist chưa hoàn thành phản hồi.");
    const text = outputText(payload);
    if (!text) throw new AIProviderError("INVALID_RESPONSE", "AI Stylist không trả structured output.");
    try { return { provider: this.name, model, ...(typeof record.id === "string" ? { requestId: record.id } : {}), data: JSON.parse(text) }; }
    catch { throw new AIProviderError("INVALID_RESPONSE", "Structured output của AI không phải JSON hợp lệ."); }
  }
}
