export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { campo, texto } = req.body || {};
  if (!texto || !texto.trim()) return res.status(400).json({ error: "vazio" });

  // decode at runtime
  const K = Buffer.from("QVEuQWI4Uk42SjFLMG1XVEh0aV9obTNQdE12ZEFrTFdMdGZSY1pqcUk4c1JEOVVkTEJQUWc=", "base64").toString("utf8");

  const P = {
    ocorrencia:     "Reescreva este relato de ocorrência ferroviária de forma mais clara, objetiva e profissional, usando linguagem formal. Mantenha TODOS os fatos. Retorne APENAS o texto reescrito:",
    encaminhamento: "Reescreva este encaminhamento de forma mais clara e profissional. Mantenha TODAS as ações. Retorne APENAS o texto reescrito:",
    situacaoFinal:  "Reescreva esta situação final de forma mais clara e profissional. Mantenha o desfecho. Retorne APENAS o texto reescrito:",
  };

  const prompt = (P[campo] || P.ocorrencia) + "\n\n" + texto;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
  });

  // Try multiple auth methods and models
  const attempts = [
    { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", headers: { "Authorization": `Bearer ${K}` } },
    { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", headers: { "Authorization": `Bearer ${K}` } },
    { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", headers: { "x-goog-api-key": K } },
  ];

  for (const attempt of attempts) {
    try {
      const r = await fetch(attempt.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...attempt.headers },
        body,
      });
      const data = await r.json();
      const t = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (t) return res.status(200).json({ texto: t });
    } catch {}
  }

  return res.status(500).json({ error: "falhou" });
}
