import { GoogleGenAI } from "@google/genai";

export type AnalyzeBody = {
  provider?: string;
  apiKey?: string;
  imageBase64?: string;
  mimeType?: string;
  fileName?: string;
  mode?: "metadata" | "prompt";
  minTitleWords?: number;
  maxTitleWords?: number;
  minKeywords?: number;
  maxKeywords?: number;
  singleWordOnly?: boolean;
  customPrompt?: string;
  platforms?: string[];
};

export function buildSystemPrompt(body: AnalyzeBody): string {
  const { mode = "metadata", minTitleWords = 4, maxTitleWords = 12, minKeywords = 15, maxKeywords = 49, singleWordOnly = true, customPrompt = "", platforms = ["AdobeStock"] } = body;
  const keywordRule = singleWordOnly ? "ONLY single-word keywords, lowercase, no duplicates, no phrases." : "Keywords can be single words or highly relevant short commercial phrases.";
  const platformContext = platforms.length ? `Target microstock platforms: ${platforms.join(", ")}.` : "";
  const buyerRules = `
CRITICAL STOCK MARKETPLACE BUYER TARGETING:
- Analyze the exact visual design archetype: 3D render, isometric, vector, flat design, photography, product shot, flat lay, lifestyle, abstract background, geometric pattern, UI/UX, template or banner.
- Build a commercial title as [Primary Subject/Concept] + [Design Style/Medium] + [Commercial Use Case/Composition Feature].
- Title must be ${minTitleWords}-${maxTitleWords} words, fluent professional English, never spammy.
- Keywords must be ${minKeywords}-${maxKeywords}, prioritized by buyer search intent. First prioritize medium/style and subject, then commercial uses, composition/layout, industry concepts, and aesthetic terms. ${keywordRule}`;
  const extra = customPrompt.trim() ? ` Additional creator instruction: ${customPrompt.trim()}` : "";
  if (mode === "prompt") return `You are an expert AI prompt engineer specializing in Adobe Stock commercial asset recreation. Analyze the reference image precisely and create a detailed generation prompt reproducing its subject, composition, medium, materials, lighting, camera/framing, color harmony, textures and copy space. Avoid trademarks, logos, living artists and celebrities. The prompt must be 70-120 words.\n\n${buyerRules}\n\nReturn ONLY raw valid JSON: {"prompt":"70-120 word recreation prompt","title":"${minTitleWords}-${maxTitleWords} word buyer-targeted title","keywords":["${minKeywords}-${maxKeywords} keywords"],"description":"20-30 word commercial description"}${extra}`;
  return `You are a world-class microstock metadata optimization expert for ${platformContext || "commercial stock agencies"}. Analyze the image thoroughly for commercial search visibility and Adobe Stock compliance. ${buyerRules} Also provide a detailed Adobe Stock compliant recreation prompt of 60-100 words.\n\nReturn ONLY raw valid JSON: {"title":"${minTitleWords}-${maxTitleWords} word buyer-targeted title","keywords":["${minKeywords}-${maxKeywords} prioritized keywords"],"description":"15-25 word commercial description","prompt":"60-100 word recreation prompt"}${extra}`;
}

export function parseModelOutput(rawText: string, singleWordOnly = true, minKeywords = 15, maxKeywords = 49) {
  let title = "", description = "", prompt = "", keywords: string[] = [];
  const clean = String(rawText || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) {
      const p = JSON.parse(m[0]);
      title = p.title ? String(p.title) : "";
      description = p.description ? String(p.description) : "";
      prompt = p.prompt ? String(p.prompt) : "";
      keywords = Array.isArray(p.keywords) ? p.keywords.map(String) : Array.isArray(p.tags) ? p.tags.map(String) : [];
    }
  } catch {}
  if (!title) title = clean.split("\n").map(x => x.replace(/[{}[\]",:]/g, "").trim()).find(x => x.length > 3) || "Commercial Stock Asset";
  if (!keywords.length) keywords = clean.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !["title","keywords","description","prompt","json","true","false"].includes(w));
  keywords = singleWordOnly ? keywords.flatMap(k => k.split(/[\s,]+/)).map(k => k.toLowerCase().replace(/[^a-z0-9-]/g, "")).filter(k => k.length > 1) : keywords.map(k => k.toLowerCase().trim()).filter(k => k.length > 1);
  keywords = Array.from(new Set(keywords)).slice(0, maxKeywords);
  if (!description) description = title;
  if (!prompt) prompt = `${title}, professional commercial stock asset, crisp lighting, high resolution`;
  if (keywords.length < minKeywords) {
    const extra = ["commercial","stock","design","creative","modern","professional","visual","asset","marketing","advertising","template","background","quality","clean","digital"];
    for (const k of extra) if (keywords.length < minKeywords && !keywords.includes(k)) keywords.push(k);
  }
  return { title: title.trim().slice(0, 200), keywords, description: description.trim(), prompt: prompt.trim(), raw: rawText };
}

async function openAICompatible(url: string, key: string, model: string, prompt: string, dataUrl: string, extraHeaders: Record<string,string> = {}) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...extraHeaders }, body: JSON.stringify({ model, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } }] }], max_tokens: 2048, temperature: 0.4 }) });
  const data: any = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || data?.message || `Provider error: ${r.status}`);
  return data?.choices?.[0]?.message?.content || data?.text || "";
}

export async function analyze(body: AnalyzeBody): Promise<ReturnType<typeof parseModelOutput>> {
  const provider = body.provider || "gemini";
  const key = body.apiKey?.trim() || (provider === "gemini" ? process.env.GEMINI_API_KEY?.trim() : "");
  if (!body.imageBase64) throw Object.assign(new Error("Missing imageBase64 data"), { status: 400 });
  if (!key) throw Object.assign(new Error(`An API key is required for ${provider.toUpperCase()}.`), { status: 400 });
  const prompt = buildSystemPrompt(body);
  let raw = "";
  const dataUrl = `data:${body.mimeType || "image/jpeg"};base64,${body.imageBase64}`;
  if (provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    let last: any;
    for (const model of ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"]) {
      try {
        const r = await ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: body.mimeType || "image/jpeg", data: body.imageBase64 } }] }], config: { temperature: 0.4, maxOutputTokens: 2048 } });
        raw = r.text || ""; if (raw) break;
      } catch (e) { last = e; }
    }
    if (!raw && last) throw last;
  } else if (provider === "groq") raw = await openAICompatible("https://api.groq.com/openai/v1/chat/completions", key, "llama-3.2-11b-vision-preview", prompt, dataUrl);
  else if (provider === "openrouter") raw = await openAICompatible("https://openrouter.ai/api/v1/chat/completions", key, "google/gemini-flash-1.5", prompt, dataUrl, { "HTTP-Referer": "https://prompt-ex.vercel.app", "X-Title": "Prompt Executor Microstock" });
  else if (provider === "together") raw = await openAICompatible("https://api.together.xyz/v1/chat/completions", key, "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo", prompt, dataUrl);
  else if (provider === "mistral") raw = await openAICompatible("https://api.mistral.ai/v1/chat/completions", key, "pixtral-12b-2409", prompt, dataUrl);
  else if (provider === "huggingface") raw = await openAICompatible("https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-11B-Vision/v1/chat/completions", key, "meta-llama/Llama-3.2-11B-Vision", prompt, dataUrl);
  else if (provider === "cohere") {
    const r = await fetch("https://api.cohere.ai/v1/chat", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: "command-r", message: `${prompt}\nImage filename context: ${body.fileName || "image.jpg"}. Provide high quality microstock metadata.` }) });
    const data: any = await r.json(); if (!r.ok) throw new Error(data?.message || `Cohere error: ${r.status}`); raw = data?.text || "";
  } else throw Object.assign(new Error(`Unsupported provider: ${provider}`), { status: 400 });
  if (!raw) throw new Error("AI provider returned an empty response.");
  return parseModelOutput(raw, body.singleWordOnly ?? true, body.minKeywords ?? 15, body.maxKeywords ?? 49);
}
