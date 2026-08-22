import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const summarizeInvestigation = async (investigationData) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Summarize this investigation for an analyst in 3-4 sentences. Be concise and factual:\n\n${JSON.stringify(
    investigationData
  )}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};