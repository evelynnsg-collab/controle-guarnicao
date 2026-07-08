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

const PROMPT =
  "Você é um redator de relatórios operacionais de segurança ferroviária (CPTM/Metrô). " +
  "Reescreva o texto abaixo de forma clara, bem escrita e profissional. " +
  "Corrija erros de português, melhore a clareza e o vocabulário. " +
  "Use linguagem formal mas direta. Mantenha todos os fatos originais. " +
  "Responda APENAS com o texto reescrito, sem comentários, aspas ou explicações.";

export const formalizarTexto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {

    const userMsg = `Campo: ${LABELS[data.campo]}\n\nTexto:\n${data.text}`;

    // 1. Tenta Gemini com chave do ambiente
    const gKey = process.env.GEMINI_API_KEY;
    if (gKey) {
      for (const model of ["gemini-2.0-flash-exp", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]) {
        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(gKey.startsWith("AQ.") 
                  ? { "Authorization": `Bearer ${gKey}` }
                  : { "x-goog-api-key": gKey }),
              },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\n${userMsg}` }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
              }),
            }
          );
          if (r.ok) {
            const j = await r.json();
            const t = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (t && t.length > 5) return { text: t };
          }
        } catch { continue; }
      }
    }

    // 2. Tenta Anthropic Claude com chave do ambiente
    const aKey = process.env.ANTHROPIC_API_KEY;
    if (aKey) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": aKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 800,
            system: PROMPT,
            messages: [{ role: "user", content: userMsg }],
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const t = j?.content?.[0]?.text?.trim();
          if (t && t.length > 5) return { text: t };
        }
      } catch {}
    }

    // 3. Fallback local — sempre funciona
    return { text: melhorarLocal(data.text) };
  });

function melhorarLocal(texto: string): string {
  let t = texto.trim();
  if (!t) return t;

  // Capitaliza início
  t = t.charAt(0).toUpperCase() + t.slice(1);

  // Capitaliza após ponto
  t = t.replace(/([.!?]\s+)([a-záéíóúâêôãõüç])/gi,
    (_: string, p: string, l: string) => p + l.toUpperCase());

  // Substitui termos informais por formais
  const sub: [RegExp, string][] = [
    [/\bpra\b/gi, "para"],
    [/\bpro\b/gi, "para o"],
    [/\bpros\b/gi, "para os"],
    [/\bta\b/gi, "está"],
    [/\btava\b/gi, "estava"],
    [/\bto\b/gi, "estou"],
    [/\bq\b/gi, "que"],
    [/\bvc\b/gi, "você"],
    [/\bvcs\b/gi, "vocês"],
    [/\bpq\b/gi, "porque"],
    [/\btbm\b/gi, "também"],
    [/\bmsm\b/gi, "mesmo"],
    [/\bblz\b/gi, "beleza"],
    [/\bok\b/gi, "confirmado"],
    [/\bchamou\b/gi, "acionou"],
    [/\bchamamos\b/gi, "acionamos"],
    [/\bchamei\b/gi, "acionei"],
    [/\bligamos\b/gi, "acionamos"],
    [/\bcaiu\b/gi, "sofreu queda"],
    [/\bcairam\b/gi, "sofreram queda"],
    [/\bpassou mal\b/gi, "apresentou mal-estar"],
    [/\bpassava mal\b/gi, "apresentava mal-estar"],
    [/\bcliente\b/gi, "passageiro(a)"],
    [/\bpessoa\b/gi, "passageiro(a)"],
    [/\bdesacordado\b/gi, "inconsciente"],
    [/\bsangrou\b/gi, "apresentou sangramento"],
    [/\bbrigou\b/gi, "envolveu-se em conflito verbal"],
    [/\bfomos\b/gi, "nos dirigimos"],
    [/\bfui\b/gi, "dirigi-me"],
    [/\bchegou\b/gi, "chegou ao local"],
    [/\blevamos\b/gi, "encaminhamos"],
    [/\bficou\b/gi, "permaneceu"],
    [/\bfoi embora\b/gi, "retirou-se do local"],
    [/\baconteceu\b/gi, "ocorreu"],
    [/\bviu\b/gi, "observou"],
  ];

  sub.forEach(([from, to]) => { t = t.replace(from, to); });

  // Remove espaços duplos
  t = t.replace(/\s{2,}/g, " ").trim();

  // Garante ponto final
  if (!/[.!?]$/.test(t)) t += ".";

  return t;
}
