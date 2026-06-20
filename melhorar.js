export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { ocorrencia, encaminhamento, situacaoFinal } = req.body;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  const prompt = `Você é um assistente de escrita para relatórios operacionais ferroviários.
Reescreva os campos abaixo de forma mais clara, profissional e coerente, sem alterar o sentido.
Responda APENAS com JSON válido no formato: {"ocorrencia":"...","encaminhamento":"...","situacaoFinal":"..."}
Não adicione nenhum texto fora do JSON.

Ocorrência: ${ocorrencia || ""}
Encaminhamento: ${encaminhamento || ""}
Situação final: ${situacaoFinal || ""}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
