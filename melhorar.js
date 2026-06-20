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

  // Tenta com query param (chaves AIzaSy) e com header Bearer (chaves AQ.)
  const urls = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
  ];

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  });

  let lastError = "";

  // Tenta primeiro com Bearer token (formato AQ.)
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GEMINI_KEY}`,
        },
        body,
      }
    );
    const d = await r.json();
    if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = d.candidates[0].content.parts[0].text;
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    }
    lastError = JSON.stringify(d);
  } catch (e) { lastError = e.message; }

  // Tenta com X-goog-api-key header
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY,
        },
        body,
      }
    );
    const d = await r.json();
    if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = d.candidates[0].content.parts[0].text;
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    }
    lastError = JSON.stringify(d);
  } catch (e) { lastError = e.message; }

  // Tenta com query param
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const d = await r.json();
      if (d.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = d.candidates[0].content.parts[0].text;
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return res.status(200).json(parsed);
      }
      lastError = JSON.stringify(d);
    } catch (e) { lastError = e.message; }
  }

  res.status(500).json({ error: "Falha na API Gemini: " + lastError });
}
