// aiService.js — uses Groq's free OpenAI-compatible chat API.
// No extra npm package needed: Node 18+ has fetch() built in.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b"; // Groq deprecated its Llama chat models; this is their current standard-tier default

async function callGroq(prompt, { maxTokens = 400 } = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in .env");
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an intelligence-analysis assistant. Be concise, neutral, and factual. Never state anything as fact that isn't present in the data you're given, and never speculate about guilt or intent.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// GET /api/investigations/:id/summary
export async function summarizeInvestigation(investigationData) {
  const prompt = `Summarize this investigation for an analyst in 3-4 sentences. Be concise and factual, using only the data given:\n\n${JSON.stringify(investigationData)}`;
  return callGroq(prompt, { maxTokens: 350 });
}

// Turns a rule-based alert's score + reasons into one readable analyst sentence.
// The rules still decide *whether* an alert fires — this only narrates the result,
// so explainability isn't traded away for a nicer sentence.
export async function explainAlert({ what, why }) {
  const prompt = `Rewrite this rule-based detection as ONE clear, neutral sentence for a human analyst. Do not add any claim that isn't already in the text below.\n\nFinding: ${what}\nRule-based reasons: ${why}\n\nStart the sentence with "This was flagged because".`;
  return callGroq(prompt, { maxTokens: 700 });
}

// Optional executive-summary paragraph for generated reports.
export async function summarizeReport(reportData) {
  const prompt = `Write a 3-sentence executive summary for an intelligence report. Use only the numbers/data given below — do not invent anything:\n\n${JSON.stringify(reportData)}`;
  return callGroq(prompt, { maxTokens: 350 });
}