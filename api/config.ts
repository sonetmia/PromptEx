export default async function handler(_req: any, res: any) {
  return res.status(200).json({
    success: true,
    hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
    providers: ["gemini", "groq", "openrouter", "together", "mistral", "huggingface", "cohere"],
  });
}
