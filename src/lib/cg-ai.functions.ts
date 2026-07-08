import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1),
  campo: z.enum(["ocorrencia", "encaminhamento", "situacaoFinal", "condicoesInformadas"]),
});

const SYSTEM =
  "Você é um assistente especializado em reescrever textos de relatórios operacionais " +
  "de segurança ferroviária (CPTM/Metrô São Paulo). " +
  "Reescreva o texto do agente de forma clara, correta e profissional. " +
  "Use português formal, corrija erros de ortografia e gramática, " +
  "melhore a estrutura das frases. Mantenha TODOS os fatos e informações originais. " +
  "NÃO invente nada. Retorne APENAS o texto reescrito, sem aspas, sem explicações.";

export const formalizarTexto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    // Usa Claude Haiku via Anthropic API (sem precisar de chave externa - usa a do ambiente Vercel)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: SYSTEM,
            messages: [{ role: "user", content: `Texto para reescrever:\n${data.text}` }],
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const t = j?.content?.[0]?.text?.trim();
          if (t && t.length > 5) return { text: t };
        }
      } catch {}
    }

    // Gemini com qualquer formato de chave
    const gKey = process.env.GEMINI_API_KEY;
    if (gKey) {
      const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(gKey.startsWith("AQ.") || gKey.startsWith("ya29.")
          ? { "Authorization": `Bearer ${gKey}` }
          : { "x-goog-api-key": gKey }),
      };
      const body = JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${SYSTEM}\n\nTexto para reescrever:\n${data.text}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      });

      for (const model of models) {
        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            { method: "POST", headers, body }
          );
          if (r.ok) {
            const j = await r.json();
            const t = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (t && t.length > 5) return { text: t };
          }
        } catch { continue; }
      }
    }

    // Fallback inteligente local
    return { text: reescreverLocal(data.text) };
  });

function reescreverLocal(texto: string): string {
  let t = texto.trim();
  if (!t) return t;

  // Capitaliza primeira letra
  t = t.charAt(0).toUpperCase() + t.slice(1);

  // Capitaliza após pontuação
  t = t.replace(/([.!?]\s+)([a-záéíóúâêôãõüç])/gi,
    (_: string, p: string, l: string) => p + l.toUpperCase());

  const subs: [RegExp, string][] = [
    [/\bpra\b/gi, "para"], [/\bpro\b/gi, "para o"], [/\bpros\b/gi, "para os"],
    [/\bta\b/gi, "está"], [/\btava\b/gi, "estava"], [/\bto\b/gi, "estou"],
    [/\bq\b/gi, "que"], [/\bvc\b/gi, "você"], [/\bvcs\b/gi, "vocês"],
    [/\bpq\b/gi, "porque"], [/\btbm\b/gi, "também"], [/\bmsm\b/gi, "mesmo"],
    [/\bok\b/gi, "realizado"], [/\bblz\b/gi, "confirmado"],
    [/\bchamou\b/gi, "acionou"], [/\bchamamos\b/gi, "acionamos"], [/\bchamei\b/gi, "acionei"],
    [/\bligou\b/gi, "acionou"], [/\bligamos\b/gi, "acionamos"],
    [/\bcaiu\b/gi, "sofreu queda"], [/\bcairam\b/gi, "sofreram queda"],
    [/\bpassou mal\b/gi, "apresentou mal-estar"], [/\bpassava mal\b/gi, "apresentava mal-estar"],
    [/\bcliente\b/gi, "passageiro(a)"], [/\bpessoa\b/gi, "passageiro(a)"],
    [/\bindivíduo\b/gi, "passageiro(a)"], [/\busuário\b/gi, "passageiro(a)"],
    [/\bdesacordado\b/gi, "inconsciente"], [/\bdesacordada\b/gi, "inconsciente"],
    [/\bsangrou\b/gi, "apresentou sangramento"],
    [/\bbrigou\b/gi, "envolveu-se em conflito verbal"],
    [/\bbrigaram\b/gi, "envolveram-se em conflito verbal"],
    [/\bfomos\b/gi, "nos dirigimos"], [/\bfui\b/gi, "dirigi-me"],
    [/\bchegou\b/gi, "chegou ao local"], [/\bchegamos\b/gi, "chegamos ao local"],
    [/\bfoi embora\b/gi, "retirou-se do local"], [/\bfoi liberado\b/gi, "foi liberado"],
    [/\blevou\b/gi, "encaminhou"], [/\blevaram\b/gi, "encaminharam"],
    [/\blevamos\b/gi, "encaminhamos"], [/\baconteceu\b/gi, "ocorreu"],
    [/\bviu\b/gi, "observou"], [/\bviram\b/gi, "observaram"],
    [/\bficou\b/gi, "permaneceu"], [/\bficaram\b/gi, "permaneceram"],
    [/\btava\b/gi, "estava"], [/\btavam\b/gi, "estavam"],
    [/\bpediu\b/gi, "solicitou"], [/\bpediram\b/gi, "solicitaram"],
    [/\bfez\b/gi, "realizou"], [/\bfizemos\b/gi, "realizamos"],
    [/\bdeu\b/gi, "apresentou"], [/\bderam\b/gi, "apresentaram"],
    [/\btrouxe\b/gi, "conduziu"], [/\btrouxeram\b/gi, "conduziram"],
    [/\bsamu\b/gi, "SAMU"], [//gi, "SAMU"],
    [/\bpm\b/gi, "Polícia Militar"], [/\bcob\b/gi, "COB"],
    [/\bpid\b/gi, "PID"], [/\bcistt\b/gi, "CISTT"],
  ];

  subs.forEach(([from, to]) => { t = t.replace(from, to); });

  // Remove espaços duplos
  t = t.replace(/\s{2,}/g, " ").trim();

  // Garante ponto final
  if (!/[.!?]$/.test(t)) t += ".";

  return t;
}
