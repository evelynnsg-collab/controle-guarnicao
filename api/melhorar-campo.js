export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).end();

  const { campo, texto } = req.body;
  if (!texto || !texto.trim()) return res.status(400).json({ error: "Texto vazio" });

  const prompts = {
    ocorrencia:     "Você é um redator de relatórios operacionais ferroviários. Reescreva o relato abaixo de forma mais clara, objetiva e profissional, usando linguagem formal adequada para documentação oficial. Mantenha TODOS os fatos e informações. Retorne APENAS o texto reescrito, sem comentários ou explicações adicionais:\n\n",
    encaminhamento: "Você é um redator de relatórios operacionais ferroviários. Reescreva o encaminhamento abaixo de forma mais clara, objetiva e profissional. Mantenha TODAS as ações e medidas descritas. Retorne APENAS o texto reescrito, sem comentários:\n\n",
    situacaoFinal:  "Você é um redator de relatórios operacionais ferroviários. Reescreva a situação final abaixo de forma mais clara, objetiva e profissional. Mantenha o desfecho descrito. Retorne APENAS o texto reescrito, sem comentários:\n\n",
  };

  const prompt = (prompts[campo] || prompts.ocorrencia) + texto;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const texto_melhorado = data.content?.find(b => b.type === "text")?.text?.trim();

    if (texto_melhorado) {
      return res.status(200).json({ texto: texto_melhorado });
    } else {
      return res.status(500).json({ error: "Sem resposta da IA" });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
