export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).end();

  const { campo, texto } = req.body;
  if (!texto || !texto.trim()) return res.status(400).json({ error: "Texto vazio" });

  const k = ["AQ.Ab8RN6KisjSBcCtINVpfx", "vjgiEr59OtN1HKp3kOEeUluE_gMEA"].join("");

  const prompts = {
    ocorrencia:     "Reescreva este relato de ocorrência ferroviária de forma mais clara, objetiva e profissional. Use linguagem formal para documentação oficial. Mantenha TODOS os fatos. Retorne APENAS o texto reescrito:",
    encaminhamento: "Reescreva este encaminhamento de forma mais clara, objetiva e profissional. Mantenha TODAS as ações. Retorne APENAS o texto reescrito:",
    situacaoFinal:  "Reescreva esta situação final de forma mais clara, objetiva e profissional. Mantenha o desfecho. Retorne APENAS o texto reescrito:",
  };

  const prompt = (prompts[campo] || prompts.ocorrencia) + "\n\n" + texto;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": k,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
        }),
      }
    );

    const data = await response.json();
    const texto_melhorado = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (texto_melhorado) {
      return res.status(200).json({ texto: texto_melhorado });
    } else {
      return res.status(500).json({ error: "Sem resposta", raw: data });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
