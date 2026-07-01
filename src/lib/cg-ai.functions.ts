import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  text: z.string().min(1),
  campo: z.enum(["ocorrencia", "encaminhamento", "situacaoFinal"]),
});

const LABELS: Record<string, string> = {
  ocorrencia: "descrição da ocorrência",
  encaminhamento: "encaminhamento dado",
  situacaoFinal: "situação final",
};

export const formalizarTexto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "Você é um redator de relatórios operacionais de segurança ferroviária (CPTM/Metrô). " +
        "Reescreva o texto do agente de forma clara, organizada e com boa gramática, " +
        "mantendo um tom leve e natural — não precisa ser excessivamente formal ou rebuscado. " +
        "Corrija erros de ortografia e pontuação, deixe o texto bem escrito, porém simples e direto. " +
        "Mantenha todos os fatos e dados originais, não invente informações. " +
        "Responda APENAS com o texto reescrito, sem aspas nem comentários.",
      prompt: `Campo: ${LABELS[data.campo]}\n\nTexto original:\n${data.text}`,
    });

    return { text: text.trim() };
  });
