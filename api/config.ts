const PROVIDERS = ["gemini", "groq", "openrouter", "together", "mistral", "huggingface", "cohere"];

function cleanKey(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
      providers: PROVIDERS,
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const provider = cleanKey(req.body?.provider).toLowerCase();
    const apiKey = cleanKey(req.body?.apiKey);
    if (!PROVIDERS.includes(provider)) {
      return res.status(400).json({ success: false, error: "Unsupported API provider." });
    }
    if (!apiKey) {
      return res.status(400).json({ success: false, error: "API key is required." });
    }

    let response: Response;
    if (provider === "gemini") {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    } else if (provider === "groq") {
      response = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    } else if (provider === "openrouter") {
      response = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    } else if (provider === "together") {
      response = await fetch("https://api.together.xyz/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    } else if (provider === "mistral") {
      response = await fetch("https://api.mistral.ai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    } else if (provider === "cohere") {
      response = await fetch("https://api.cohere.ai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
    } else {
      // HuggingFace has public model-list endpoints, so validate the token against
      // the authenticated whoami endpoint instead of a public catalog endpoint.
      response = await fetch("https://huggingface.co/api/whoami-v2", { headers: { Authorization: `Bearer ${apiKey}` } });
    }

    if (!response.ok) {
      let message = `API rejected the key (${response.status}).`;
      try {
        const data: any = await response.json();
        message = data?.error?.message || data?.error || data?.message || message;
      } catch {}
      return res.status(400).json({ success: false, error: String(message) });
    }

    return res.status(200).json({ success: true, provider, message: "API key verified successfully." });
  } catch (error: any) {
    return res.status(502).json({ success: false, error: error?.message || "Could not reach the API provider." });
  }
}
