import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1),
  campo: z.enum(["ocorrencia", "encaminhamento", "situacaoFinal"]),
});

const LABELS: Record<string, string> = {
  ocorrencia: "descrição da ocorrência",
  encaminhamento: "encaminhamento dado",
  situacaoFinal: "situação final",
};

const SYSTEM_PROMPT =
  "Você é um redator de relatórios operacionais de segurança ferroviária (CPTM/Metrô). " +
  "Reescreva o texto do agente de forma clara, organizada e com boa gramática, " +
  "mantendo um tom leve e natural — não precisa ser excessivamente formal ou rebuscado. " +
  "Corrija erros de ortografia e pontuação, deixe o texto bem escrito, porém simples e direto. " +
  "Mantenha todos os fatos e dados originais, não invente informações. " +
  "Responda APENAS com o texto reescrito, sem aspas nem comentários.";

export const formalizarTexto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");

    const prompt = `${SYSTEM_PROMPT}\n\nCampo: ${LABELS[data.campo]}\n\nTexto original:\n${data.text}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) throw new Error("Resposta vazia da IA");

    return { text: text.trim() };
  });
