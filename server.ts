import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Generous limit for high-resolution base64 stock images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Config info check
app.get("/api/config", (_req: Request, res: Response) => {
  res.json({
    hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
  });
});

interface AnalyzeRequestBody {
  provider: string;
  apiKey?: string;
  imageBase64: string;
  mimeType: string;
  fileName?: string;
  mode: "metadata" | "prompt";
  minTitleWords?: number;
  maxTitleWords?: number;
  minKeywords?: number;
  maxKeywords?: number;
  singleWordOnly?: boolean;
  customPrompt?: string;
  platforms?: string[];
}

function buildSystemPrompt(body: AnalyzeRequestBody): string {
  const {
    mode,
    minTitleWords = 4,
    maxTitleWords = 12,
    minKeywords = 15,
    maxKeywords = 49,
    singleWordOnly = true,
    customPrompt = "",
    platforms = ["AdobeStock"],
  } = body;

  const keywordRule = singleWordOnly
    ? "ONLY single-word keywords, absolutely no phrases or multi-word expressions, lowercase, no duplicates, separated clearly."
    : "Keywords can be single words or highly relevant short commercial phrases.";

  const extra = customPrompt?.trim() ? ` Additional creator instruction: ${customPrompt.trim()}` : "";
  const platformContext = platforms && platforms.length > 0 ? `Target microstock platforms: ${platforms.join(", ")}.` : "";

  const buyerTargetingRules = `
CRITICAL STOCK MARKETPLACE BUYER TARGETING & DESIGN-BASED SEO:
1. Target Creative Stock Buyers (Graphic Designers, Marketers, Art Directors, Publishers):
   - Buyers search stock marketplaces to find assets for concrete commercial projects (web banners, landing page headers, marketing ads, social media posts, presentations, packaging, product mockups, editorial articles).
   - Analyze the EXACT visual design archetype of this image:
     * 3D Render / Isometric / Octane / Clay render / Podium display mockup
     * Vector Graphic / Flat design / Minimal line art / Icon set / Infographic
     * Commercial Photography / Studio product shot / Overhead flat lay / Lifestyle / Workplace / Portrait
     * Abstract Background / Geometric pattern / Fluid gradient / Luxury marble texture / Clean backdrop
     * UI/UX / Presentation layout / Social media template / Banner canvas
   
2. Buyer-Focused Commercial Title:
   - Construct the title using high-converting commercial stock search architecture:
     [Primary Subject / Concept] + [Specific Design Style / Visual Medium] + [Commercial Use Case or Composition Feature]
     Examples:
     - "Minimalist 3D Product Podium Display with Copy Space for Cosmetics Mockup"
     - "Modern Abstract Geometric Background for Corporate Website Banner"
     - "Isometric Business Team Collaboration Vector Illustration for Mobile App"
     - "Tropical Palm Leaves Flat Lay on Pastel Surface for Summer Sale Banner"
   - Word Count: Strictly between ${minTitleWords} and ${maxTitleWords} words.
   - Tone: Fluent, grammatical, professional English that ranks high in stock search algorithms without spammy clickbait.

3. Buyer-Targeted Tags / Keywords (Algorithmic Ranking Priority):
   - On microstock platforms (Adobe Stock, Shutterstock, Freepik), the FIRST 10 KEYWORDS carry the highest search algorithm weight.
   - Place the highest-converting buyer search queries at the top of the keywords array:
     * Tier 1 (First 5-10 tags): Exact design style, artistic medium, and primary subject (e.g., "3d", "vector", "illustration", "render", "photo", "isometric", "minimalist", "geometric", "abstract", "mockup", plus main subject).
     * Tier 2 (Commercial Use Cases): What buyers want to build with it (e.g., "banner", "background", "backdrop", "template", "header", "advertising", "marketing", "presentation", "flyer", "poster", "social", "media", "wallpaper").
     * Tier 3 (Composition & Layout Features): Useful design filters buyers search (e.g., "copyspace", "blank", "empty", "space", "clean", "isolated", "frame", "texture", "layout", "seamless").
     * Tier 4 (Industry Themes & Concepts): Sector relevance (e.g., "business", "technology", "finance", "health", "lifestyle", "corporate", "wellness", "creative", "ecommerce", "sale").
     * Tier 5 (Aesthetic Mood & Color Palette): (e.g., "modern", "luxury", "vibrant", "elegant", "futuristic", "fresh", "bright", and dominant colors).
   - Formatting: ${keywordRule} Provide strictly between ${minKeywords} and ${maxKeywords} keywords.`;

  if (mode === "prompt") {
    return `You are an expert AI prompt engineer specializing in Adobe Stock generative AI guidelines and photorealistic commercial asset recreation.
Analyze the provided reference image with extreme scrutiny. Your objective is to craft an ultra-detailed, comprehensive generation prompt that allows an AI generator (such as Adobe Firefly, Midjourney v6, or Flux) to reproduce the EXACT design, artistic medium, subject, composition, and visual quality of this reference image.

CRITICAL ADOBE STOCK COMPLIANCE & RECREATION RULES:
1. Exact Visual Fidelity to Reference:
   - Precisely replicate what is seen in the reference image: exact subject, pose, action, clothing, materials, texture details, objects, and environmental surroundings.
   - Replicate the exact design aesthetic, style, background, spatial depth, and copy space.
2. Ultra-Detailed Specifications for Perfect Design:
   - Subject & Materials: Explicit physical features, lifelike textures, surface finishes (e.g. brushed metal, glossy glaze, matte ceramic, woven linen), anatomical accuracy.
   - Medium & Artistic Style: State the exact photographic or illustrative medium (e.g., commercial studio product photograph, high-end lifestyle stock portrait, minimalist 3D octane render, crisp vector graphic, clean architectural interior).
   - Lighting & Ambience: Exact studio/natural lighting setup (e.g., soft diffused softbox key lighting, warm golden hour sun flare, subtle rim lighting, clean ambient fill, natural shadow gradation).
   - Camera & Optics: Shot framing (e.g., eye-level medium shot, macro detail close-up, wide-angle environmental portrait, flat lay overhead), lens characteristics (e.g., shot on 85mm f/1.4 lens, razor-sharp subject focus, creamy background bokeh, high dynamic range).
   - Color Palette & Grading: Exact color harmony, tonality, contrast levels, and atmosphere.
3. Adobe Stock Strict Policy:
   - Absolutely NO trademarked brand names, logos, or commercial intellectual property (NO Nike, Apple, Coca-Cola, etc.).
   - Absolutely NO names of living artists or real celebrities (Adobe Stock rejects prompts copying specific artists).
   - Use clean, professional, commercial-grade descriptive terminology.
4. Prompt Length & Substance:
   - The "prompt" field MUST be thoroughly detailed (70 to 120 words) with rich technical and visual detail to guarantee flawless design reproduction.

${buyerTargetingRules}

Return ONLY valid JSON matching this schema:
{
  "prompt": "ultra-detailed, comprehensive AI recreation prompt (70-120 words) capturing every visual facet of the reference image adhering to Adobe Stock standards for perfect design generation",
  "title": "buyer-targeted commercial stock title matching design and use cases strictly between ${minTitleWords} and ${maxTitleWords} words",
  "keywords": ["array", "of", ${minKeywords}, "to", ${maxKeywords}, "keywords", "prioritizing high-converting buyer search terms first", "${keywordRule}"],
  "description": "crisp, professional 20-30 word commercial stock description summarizing the scene"
}
${extra}
Do not include markdown code block backticks or formatting, return raw valid JSON only.`;
  }

  return `You are a world-class microstock metadata optimization expert for commercial agencies (${platformContext || "Adobe Stock, Shutterstock, Freepik"}).
Analyze this image thoroughly for maximum commercial search visibility and compliance with Adobe Stock standards.

${buyerTargetingRules}

ADOBE STOCK COMPLIANCE:
- Generative recreation prompt must be detailed (60-100 words), specifying exact subject, medium, lighting, camera lens, color grading, and textures while strictly avoiding trademarks, logos, and artist names.
- Commercial title strictly between ${minTitleWords} and ${maxTitleWords} words targeted directly to stock buyers.
- Keywords must follow the rule: ${keywordRule} (between ${minKeywords} and ${maxKeywords} keywords prioritized by buyer search volume).

Return ONLY valid JSON matching this schema:
{
  "title": "buyer-targeted commercial title strictly between ${minTitleWords} and ${maxTitleWords} words, high-converting for designers and marketers",
  "keywords": ["array", "of", "${minKeywords} to ${maxKeywords} buyer-targeted commercial keywords prioritized by search volume", "${keywordRule}"],
  "description": "brief, professional 15-25 word commercial stock description",
  "prompt": "detailed Adobe Stock compliant recreation prompt (60-100 words) describing subject, medium, camera, lighting, and textures to reproduce this exact design"
}
${extra}
Do not include markdown code block backticks or formatting, return raw valid JSON only.`;
}

function parseModelOutput(rawText: string, singleWordOnly: boolean, minKeywords: number, maxKeywords: number) {
  let title = "";
  let keywords: string[] = [];
  let description = "";
  let prompt = "";

  const cleanText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title) title = String(parsed.title);
      if (parsed.description) description = String(parsed.description);
      if (parsed.prompt) prompt = String(parsed.prompt);
      if (Array.isArray(parsed.keywords)) keywords = parsed.keywords;
      else if (Array.isArray(parsed.tags)) keywords = parsed.tags;
    }
  } catch (_e) {
    // If JSON parsing fails due to truncation, extract fields using regex
    const titleMatch = cleanText.match(/"title"\s*:\s*"([^"]+)"/i);
    if (titleMatch) title = titleMatch[1];

    const descMatch = cleanText.match(/"description"\s*:\s*"([^"]+)"/i);
    if (descMatch) description = descMatch[1];

    const promptMatch = cleanText.match(/"prompt"\s*:\s*"([^"]+)"/i);
    if (promptMatch) prompt = promptMatch[1];

    const kwMatch = cleanText.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/i);
    if (kwMatch) {
      keywords = kwMatch[1]
        .split(",")
        .map((k) => k.replace(/["\r\n]/g, "").trim())
        .filter(Boolean);
    }
  }

  // Fallback if title was not extracted
  if (!title || title === "{" || title === "}") {
    const candidateLines = cleanText
      .split("\n")
      .map((l) => l.replace(/[{}\[\]",:]/g, "").replace(/^(title|keywords|description|prompt)/i, "").trim())
      .filter((l) => l.length > 3);
    title = candidateLines[0] || "Commercial Stock Asset";
  }

  if (keywords.length === 0) {
    const words = cleanText
      .toLowerCase()
      .split(/\W+/)
      .filter(
        (w) =>
          w.length > 2 &&
          !["title", "keywords", "description", "prompt", "json", "true", "false"].includes(w)
      );
    keywords = Array.from(new Set(words));
  }

  if (singleWordOnly) {
    keywords = keywords
      .flatMap((k) => String(k).split(/[\s,]+/))
      .map((k) => k.toLowerCase().replace(/[^a-z0-9-]/g, "").trim())
      .filter(
        (k) =>
          k.length > 1 &&
          !["title", "keywords", "description", "prompt", "json"].includes(k)
      );
  } else {
    keywords = keywords
      .map((k) => String(k).toLowerCase().trim())
      .filter((k) => k.length > 1);
  }

  keywords = Array.from(new Set(keywords)).slice(0, maxKeywords || 49);

  if (!description) description = title;
  if (!prompt) {
    prompt = `${title}, professional commercial stock photography, crisp lighting, high resolution`;
  }

  return {
    title: title.trim().slice(0, 200),
    keywords,
    description: description.trim(),
    prompt: prompt.trim(),
    raw: rawText,
  };
}

// POST /api/analyze
app.post("/api/analyze", async (req: Request, res: Response) => {
  try {
    const body: AnalyzeRequestBody = req.body;
    const {
      provider = "gemini",
      apiKey,
      imageBase64,
      mimeType = "image/jpeg",
      fileName = "image.jpg",
      singleWordOnly = true,
      minKeywords = 15,
      maxKeywords = 49,
    } = body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    const systemPrompt = buildSystemPrompt(body);

    if (provider === "gemini") {
      const activeKey = (apiKey && apiKey.trim()) || process.env.GEMINI_API_KEY;
      if (!activeKey) {
        return res.status(400).json({
          error: "Gemini API key is required. Please set GEMINI_API_KEY in environment or enter it in Manage API Keys.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Track active working Gemini model in memory to optimize latency
      const geminiCandidates = [
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash",
      ];

      let lastError: any = null;
      let rawText = "";

      for (const modelName of geminiCandidates) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemPrompt },
                  {
                    inlineData: {
                      mimeType: mimeType || "image/jpeg",
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
            config: {
              temperature: 0.4,
              maxOutputTokens: 2048,
            },
          });

          rawText = response.text || "";
          if (rawText) {
            break; // Succeeded with this model
          }
        } catch (err: any) {
          lastError = err;
          const msg = String(err.message || "");
          const isQuota =
            msg.includes("429") ||
            msg.includes("RESOURCE_EXHAUSTED") ||
            msg.includes("Quota exceeded") ||
            msg.includes("rate-limit");

          // Silently proceed to fallback model on quota limit without noisy error dumping
          if (isQuota) {
            continue;
          } else {
            continue;
          }
        }
      }

      if (!rawText && lastError) {
        throw lastError;
      }

      const result = parseModelOutput(rawText, singleWordOnly, minKeywords, maxKeywords);
      return res.json(result);
    }

    // Third-party Vision providers (Groq, OpenRouter, Together, Mistral, HuggingFace, Cohere)
    const activeKey = apiKey?.trim();
    if (!activeKey) {
      return res.status(400).json({
        error: `An API key is required for ${provider.toUpperCase()}. Please configure it in Manage API Keys.`,
      });
    }

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    if (provider === "groq") {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.4,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || `Groq error: ${resp.status}`);
      const rawText = data.choices?.[0]?.message?.content || "";
      return res.json(parseModelOutput(rawText, singleWordOnly, minKeywords, maxKeywords));
    }

    if (provider === "openrouter") {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeKey}`,
          "HTTP-Referer": req.headers.referer || "https://prompt-executor.ai",
          "X-Title": "Prompt Executor Microstock",
        },
        body: JSON.stringify({
          model: "google/gemini-flash-1.5",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.4,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || `OpenRouter error: ${resp.status}`);
      const rawText = data.choices?.[0]?.message?.content || "";
      return res.json(parseModelOutput(rawText, singleWordOnly, minKeywords, maxKeywords));
    }

    if (provider === "together") {
      const resp = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.4,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || `Together error: ${resp.status}`);
      const rawText = data.choices?.[0]?.message?.content || "";
      return res.json(parseModelOutput(rawText, singleWordOnly, minKeywords, maxKeywords));
    }

    if (provider === "mistral") {
      const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeKey}`,
        },
        body: JSON.stringify({
          model: "pixtral-12b-2409",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.4,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || `Mistral error: ${resp.status}`);
      const rawText = data.choices?.[0]?.message?.content || "";
      return res.json(parseModelOutput(rawText, singleWordOnly, minKeywords, maxKeywords));
    }

    if (provider === "huggingface") {
      const resp = await fetch(
        "https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-11B-Vision/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeKey}`,
          },
          body: JSON.stringify({
            model: "meta-llama/Llama-3.2-11B-Vision",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: systemPrompt },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
          }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `HuggingFace error: ${resp.status}`);
      const rawText = data.choices?.[0]?.message?.content || JSON.stringify(data);
      return res.json(parseModelOutput(rawText, singleWordOnly, minKeywords, maxKeywords));
    }

    if (provider === "cohere") {
      const resp = await fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeKey}`,
        },
        body: JSON.stringify({
          model: "command-r",
          message: `${systemPrompt}\nImage filename context: ${fileName}. Provide high quality microstock metadata.`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || `Cohere error: ${resp.status}`);
      const rawText = data.text || "";
      return res.json(parseModelOutput(rawText, singleWordOnly, minKeywords, maxKeywords));
    }

    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  } catch (error: any) {
    let errorMessage = error.message || "Failed to analyze image";
    let statusCode = error.status || 500;

    const isQuotaError =
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.includes("Quota exceeded") ||
      errorMessage.includes("rate-limit");

    if (isQuotaError) {
      statusCode = 429;
      errorMessage =
        "Gemini free-tier request quota is currently saturated. Please wait a few seconds or add your own free Gemini API key in 'Manage API Keys' (or switch to Groq/OpenRouter) for unlimited instant processing.";
    } else {
      console.error("API Analyze error:", errorMessage.slice(0, 200));
    }

    // Clean up any remaining ApiError prefixes
    errorMessage = errorMessage.replace(/^ApiError:\s*/i, "").trim();

    res.status(statusCode).json({ error: errorMessage });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Prompt Executor server running on port ${PORT}`);
  });
}

startServer();
