import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1),
  campo: z.enum(["ocorrencia", "encaminhamento", "situacaoFinal", "condicoesInformadas"]),
});

const LABELS: Record<string, string> = {
  ocorrencia: "descrição da ocorrência",
  encaminhamento: "encaminhamento dado",
  situacaoFinal: "situação final",
  condicoesInformadas: "condições informadas pelo paciente/passageiro",
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
    const prompt = `${SYSTEM_PROMPT}\n\nCampo: ${LABELS[data.campo]}\n\nTexto original:\n${data.text}`;

    // Try Gemini with env var key first
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      for (const model of ["gemini-2.0-flash", "gemini-1.5-flash"]) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
              }),
            },
          );
          if (res.ok) {
            const json = await res.json();
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) return { text: text.trim() };
          }
        } catch { continue; }
      }
    }

    // Try Anthropic Claude if key available
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 600,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const text = json?.content?.[0]?.text ?? "";
          if (text) return { text: text.trim() };
        }
      } catch {}
    }

    // Fallback: local improvement (always works)
    const improved = localImprove(data.text);
    return { text: improved };
  });

// Local text improvement as reliable fallback
function localImprove(text: string): string {
  let t = text.trim();
  
  // Fix capitalization
  t = t.charAt(0).toUpperCase() + t.slice(1);
  
  // Fix sentences after period
  t = t.replace(/([.!?]\s+)([a-záéíóúâêôãõüç])/gi, 
    (_: string, p: string, l: string) => p + l.toUpperCase());
  
  // Common corrections
  const fixes: [RegExp, string][] = [
    [/\bpra\b/gi, "para"], [/\bpro\b/gi, "para o"],
    [/\bta\b/gi, "está"], [/\btava\b/gi, "estava"],
    [/\bto\b/gi, "estou"], [/\btô\b/gi, "estou"],
    [/\bq\b/gi, "que"], [/\bvc\b/gi, "você"],
    [/\bpq\b/gi, "porque"], [/\btbm\b/gi, "também"],
    [/\bchamou\b/gi, "acionou"], [/\bchamamos\b/gi, "acionamos"],
    [/\bcaiu\b/gi, "sofreu queda"], [/\bpassou mal\b/gi, "apresentou mal-estar"],
    [/\bcliente\b/gi, "passageiro(a)"], [/\bpessoa\b/gi, "passageiro(a)"],
    [/\bfomos\b/gi, "nos dirigimos"], [/\bfui\b/gi, "dirigi-me"],
    [/\bsocorro\b/gi, "SAMU"], [/\bambulancia\b/gi, "SAMU"],
    [/\bdesacordado\b/gi, "inconsciente"], [/\bsangrou\b/gi, "apresentou sangramento"],
  ];
  
  fixes.forEach(([from, to]) => { t = t.replace(from, to); });
  
  // Remove double spaces
  t = t.replace(/\s{2,}/g, " ").trim();
  
  // Add period at end if missing
  if (t && !/[.!?]$/.test(t)) t += ".";
  
  return t;
}
