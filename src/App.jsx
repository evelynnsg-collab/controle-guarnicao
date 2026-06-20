import { useState, useEffect, useRef } from "react";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCfXEUb5VnKpXMSZw-yvzgXuTrV8klxDh4",
  authDomain:        "controle-guarnicao.firebaseapp.com",
  databaseURL:       "https://controle-guarnicao-default-rtdb.firebaseio.com",
  projectId:         "controle-guarnicao",
  storageBucket:     "controle-guarnicao.firebasestorage.app",
  messagingSenderId: "587679898986",
  appId:             "1:587679898986:web:177950b3ae6cf65a9d1913",
};

// ─── Número do grupo WhatsApp (somente dígitos, com DDI) ─────────────────────
const WHATSAPP_GROUP = "5511999999999"; // ← substitua pelo número do grupo

// ─── PLATAFORMAS ──────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: "2/3", label: "Plataforma 2/3", short: "2/3", color: "#1A6FD4" },
  { id: "4/5", label: "Plataforma 4/5", short: "4/5", color: "#E07B00" },
  { id: "6/7", label: "Plataforma 6/7", short: "6/7", color: "#0D9B52" },
  { id: "8",   label: "Plataforma 8",   short: "8",   color: "#CC1F1F" },
];

const C = {
  bg:      "#080C12",
  surface: "#0F1520",
  card:    "#131B28",
  border:  "#1E2A3A",
  text:    "#C8D4E8",
  muted:   "#4A5568",
  white:   "#EDF2FF",
  green:   "#22C55E",
  amber:   "#F59E0B",
  red:     "#EF4444",
  blue:    "#1A6FD4",
};

// ─── Firebase ────────────────────────────────────────────────────────────────
let _db = null;
let _fbReady = false;

async function initFirebase() {
  if (_fbReady) return _db;
  return new Promise((resolve, reject) => {
    const load = (src) => new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    Promise.all([
      load("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"),
      load("https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js"),
    ]).then(() => {
      if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
      _db = window.firebase.database();
      _fbReady = true;
      resolve(_db);
    }).catch(reject);
  });
}
function dbRef(path) { return _db.ref(path); }

// ─── TrainIcon ────────────────────────────────────────────────────────────────
function TrainIcon({ color, size = 56 }) {
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 100 55" fill="none">
      <rect x="2" y="49" width="96" height="3" rx="1.5" fill="#1E2A3A"/>
      <rect x="2" y="10" width="86" height="36" rx="6" fill={color}/>
      <rect x="2" y="36" width="86" height="10" fill="rgba(0,0,0,0.25)"/>
      <rect x="9"  y="16" width="16" height="12" rx="2" fill="rgba(255,255,255,0.9)"/>
      <rect x="32" y="16" width="16" height="12" rx="2" fill="rgba(255,255,255,0.9)"/>
      <rect x="55" y="16" width="16" height="12" rx="2" fill="rgba(255,255,255,0.9)"/>
      <path d="M88 14 Q98 22 98 32 Q98 42 88 46 L88 14Z" fill={color}/>
      <rect x="90" y="18" width="6" height="8" rx="1.5" fill="rgba(255,255,255,0.85)"/>
      <circle cx="96" cy="38" r="2.5" fill="#FFD700"/>
      <rect x="37" y="30" width="14" height="16" rx="1" fill="rgba(0,0,0,0.2)"/>
      <line x1="44" y1="30" x2="44" y2="46" stroke="rgba(0,0,0,0.3)" strokeWidth="1"/>
      <circle cx="20" cy="49" r="5.5" fill="#0F1520" stroke={color} strokeWidth="2"/>
      <circle cx="20" cy="49" r="2" fill={color}/>
      <circle cx="50" cy="49" r="5.5" fill="#0F1520" stroke={color} strokeWidth="2"/>
      <circle cx="50" cy="49" r="2" fill={color}/>
      <circle cx="78" cy="49" r="5.5" fill="#0F1520" stroke={color} strokeWidth="2"/>
      <circle cx="78" cy="49" r="2" fill={color}/>
    </svg>
  );
}

// ─── PlatformSquare ───────────────────────────────────────────────────────────
function PlatformSquare({ platform, agents, isMyPlatform, onSelect }) {
  const present    = agents.filter(a => a.atPost);
  const count      = present.length;
  const empty      = count === 0;
  const coverColor = empty ? C.red : count === 1 ? C.amber : C.green;
  const coverLabel = empty ? "Sem cobertura" : count === 1 ? "Efetivo reduzido" : "Coberta";

  return (
    <button onClick={onSelect} style={{
      background: isMyPlatform ? `${platform.color}18` : C.card,
      border: `2px solid ${isMyPlatform ? platform.color : empty ? "rgba(239,68,68,0.45)" : C.border}`,
      borderRadius: 14, padding: "16px 12px 14px",
      cursor: "pointer", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 0, transition: "all 0.18s",
      outline: "none", position: "relative", minHeight: 190, textAlign: "center",
    }}>
      {isMyPlatform && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: platform.color, borderRadius: 4,
          padding: "2px 7px", fontSize: 9, fontWeight: 800,
          color: "#fff", textTransform: "uppercase", letterSpacing: 0.8,
        }}>Minha</div>
      )}
      <div style={{ marginBottom: 10, opacity: empty ? 0.4 : 1, transition: "opacity 0.3s" }}>
        <TrainIcon color={platform.color} size={68} />
      </div>
      <div style={{ color: isMyPlatform ? platform.color : C.white, fontWeight: 800, fontSize: 14, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {platform.label}
      </div>
      <div style={{ color: empty ? C.red : platform.color, fontWeight: 900, fontSize: 38, lineHeight: 1, marginBottom: 2 }}>
        {count}
      </div>
      <div style={{ color: C.muted, fontSize: 10, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.7 }}>
        {count === 1 ? "agente" : "agentes"}
      </div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: `${coverColor}18`, border: `1px solid ${coverColor}44`,
        borderRadius: 5, padding: "3px 9px", marginBottom: 10,
        fontSize: 10, fontWeight: 700, color: coverColor,
        textTransform: "uppercase", letterSpacing: 0.7,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: coverColor, display: "inline-block" }}/>
        {coverLabel}
      </div>
      {present.length > 0 && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
          {present.map(a => (
            <div key={a.name} style={{
              background: `${platform.color}14`, border: `1px solid ${platform.color}30`,
              borderRadius: 5, padding: "4px 8px",
              fontSize: 11, color: C.text, fontWeight: 600,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{a.name}</div>
          ))}
        </div>
      )}
      {empty && (
        <div style={{
          width: "100%",
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 6, padding: "5px 8px", color: C.red, fontSize: 10, fontWeight: 700,
        }}>⚠ Sem guarnição</div>
      )}
    </button>
  );
}

// ─── CAMPO DE FORMULÁRIO ──────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, multiline, rows = 4 }) {
  const base = {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "13px 14px",
    color: C.white, fontSize: 15, outline: "none",
    fontFamily: "inherit", width: "100%",
    transition: "border-color 0.2s",
    resize: multiline ? "vertical" : "none",
    lineHeight: 1.5,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ color: C.text, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={rows}
          style={base}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      ) : (
        <input
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={base}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      )}
    </div>
  );
}

// ─── ABA OCORRÊNCIA ───────────────────────────────────────────────────────────
function OcorrenciaTab({ userName }) {
  const today = new Date().toLocaleDateString("pt-BR");

  const empty = {
    data: today, horaInicio: "", horaFim: "", local: "",
    passageiro: "", cpf: "", endereco: "", telefone: "",
    ocorrencia: "", encaminhamento: "", testemunha: "",
    situacaoFinal: "", responsavel: userName || "",
  };

  const [form, setForm]           = useState(empty);
  const [preview, setPreview]     = useState("");
  const [improving, setImproving] = useState(false);
  const [toast, setToast]         = useState("");
  const [saved, setSaved]         = useState(() => {
    try { return JSON.parse(localStorage.getItem("gn_ocorrencias")) || []; } catch { return []; }
  });
  const [view, setView] = useState("form");

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const buildText = (data) => `REGISTRO DE OCORRÊNCIA

Data: ${data.data || "—"}
Horário início: ${data.horaInicio || "—"}
Horário término: ${data.horaFim || "—"}
Local: ${data.local || "—"}

Passageiro(a): ${data.passageiro || "—"}
CPF: ${data.cpf || "—"}
Endereço: ${data.endereco || "—"}
Telefone: ${data.telefone || "—"}

Ocorrência: ${data.ocorrencia || "—"}

Encaminhamento: ${data.encaminhamento || "—"}

Testemunha: ${data.testemunha || "—"}

Situação final: ${data.situacaoFinal || "—"}

Responsável: ${data.responsavel || "—"}`;

  const handleFinalizar = () => { setPreview(buildText(form)); setView("preview"); };
  const handleCopiar    = () => { navigator.clipboard.writeText(preview).then(() => showToast("✓ Mensagem copiada!")); };
  const handleWhatsApp  = () => { window.open(`https://wa.me/${WHATSAPP_GROUP}?text=${encodeURIComponent(preview)}`, "_blank"); };
  const handleSalvar    = () => {
    const entry = { ...form, id: Date.now(), texto: preview || buildText(form) };
    const updated = [entry, ...saved].slice(0, 50);
    setSaved(updated);
    localStorage.setItem("gn_ocorrencias", JSON.stringify(updated));
    showToast("✓ Ocorrência salva!");
  };
  const handleLimpar = () => {
    setForm({ ...empty, data: today, responsavel: userName || "" });
    setPreview(""); setView("form"); showToast("Formulário limpo.");
  };

  const handleMelhorar = async () => {
    if (!form.ocorrencia && !form.encaminhamento && !form.situacaoFinal) {
      showToast("Preencha pelo menos um campo de texto."); return;
    }
    setImproving(true);
    try {
      const prompt = `Você é um assistente de escrita para relatórios operacionais ferroviários.
Reescreva os campos abaixo de forma mais clara, profissional e coerente, sem alterar o sentido.
Responda APENAS com JSON no formato: {"ocorrencia":"...","encaminhamento":"...","situacaoFinal":"..."}

Ocorrência: ${form.ocorrencia}
Encaminhamento: ${form.encaminhamento}
Situação final: ${form.situacaoFinal}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setForm(p => ({
        ...p,
        ocorrencia:     parsed.ocorrencia     || p.ocorrencia,
        encaminhamento: parsed.encaminhamento || p.encaminhamento,
        situacaoFinal:  parsed.situacaoFinal  || p.situacaoFinal,
      }));
      showToast("✓ Escrita melhorada!");
    } catch { showToast("Erro ao melhorar escrita. Tente novamente."); }
    setImproving(false);
  };

  const btnStyle = (bg, border, color) => ({
    background: bg, border: `1px solid ${border}`,
    borderRadius: 9, padding: "13px 14px",
    color, fontSize: 14, fontWeight: 800,
    cursor: "pointer", letterSpacing: 0.3,
    transition: "opacity 0.15s", flex: 1,
  });

  const inputStyle = {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "13px 14px",
    color: C.white, fontSize: 15, outline: "none",
    fontFamily: "inherit", width: "100%",
    lineHeight: 1.5, boxSizing: "border-box",
  };
  const textareaStyle = { ...inputStyle, resize: "vertical" };
  const labelStyle = { color: C.text, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 };
  const fieldWrap = { display: "flex", flexDirection: "column", gap: 6 };

  return (
    <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Sub-abas */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: C.card, borderRadius: 10, padding: 4 }}>
        {[
          { key: "form",    label: "Formulário" },
          { key: "preview", label: "Prévia",    disabled: !preview },
          { key: "history", label: `Histórico (${saved.length})` },
        ].map(tab => (
          <button key={tab.key} disabled={tab.disabled} onClick={() => !tab.disabled && setView(tab.key)} style={{
            flex: 1, padding: "9px 6px",
            background: view === tab.key ? C.surface : "transparent",
            border: view === tab.key ? `1px solid ${C.border}` : "1px solid transparent",
            borderRadius: 8,
            color: tab.disabled ? C.muted : view === tab.key ? C.white : C.muted,
            fontSize: 12, fontWeight: 700, cursor: tab.disabled ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── FORMULÁRIO ── */}
      {view === "form" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.blue}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: C.white, fontWeight: 900, fontSize: 16 }}>REGISTRO DE OCORRÊNCIA</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>Preencha os campos e toque em Finalizar</div>
          </div>

          <SectionLabel>📅 Dados da ocorrência</SectionLabel>

          <div style={fieldWrap}>
            <label style={labelStyle}>Data</label>
            <input value={form.data} onChange={e => setField("data", e.target.value)} placeholder="Ex: 20/06/2026" style={inputStyle}/>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Horário início</label>
              <input value={form.horaInicio} onChange={e => setField("horaInicio", e.target.value)} placeholder="Ex: 14:30" style={inputStyle}/>
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Horário término</label>
              <input value={form.horaFim} onChange={e => setField("horaFim", e.target.value)} placeholder="Ex: 15:10" style={inputStyle}/>
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Local</label>
            <input value={form.local} onChange={e => setField("local", e.target.value)} placeholder="Ex: Plataforma 4/5 — Estação Brás" style={inputStyle}/>
          </div>

          <SectionLabel>👤 Dados do passageiro</SectionLabel>

          <div style={fieldWrap}>
            <label style={labelStyle}>Passageiro(a)</label>
            <input value={form.passageiro} onChange={e => setField("passageiro", e.target.value)} placeholder="Nome completo" style={inputStyle}/>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>CPF</label>
            <input value={form.cpf} onChange={e => setField("cpf", e.target.value)} placeholder="000.000.000-00" style={inputStyle}/>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Endereço</label>
            <input value={form.endereco} onChange={e => setField("endereco", e.target.value)} placeholder="Rua, número, bairro, cidade" style={inputStyle}/>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Telefone</label>
            <input value={form.telefone} onChange={e => setField("telefone", e.target.value)} placeholder="(11) 9 0000-0000" style={inputStyle}/>
          </div>

          <SectionLabel>📋 Relato</SectionLabel>

          <div style={fieldWrap}>
            <label style={labelStyle}>Ocorrência</label>
            <textarea value={form.ocorrencia} onChange={e => setField("ocorrencia", e.target.value)} placeholder="Descreva o que aconteceu..." rows={5} style={textareaStyle}/>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Encaminhamento</label>
            <textarea value={form.encaminhamento} onChange={e => setField("encaminhamento", e.target.value)} placeholder="Medidas tomadas, acionamentos..." rows={4} style={textareaStyle}/>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Situação final</label>
            <textarea value={form.situacaoFinal} onChange={e => setField("situacaoFinal", e.target.value)} placeholder="Como a situação foi encerrada..." rows={3} style={textareaStyle}/>
          </div>

          <SectionLabel>✍️ Encerramento</SectionLabel>

          <div style={fieldWrap}>
            <label style={labelStyle}>Testemunha</label>
            <input value={form.testemunha} onChange={e => setField("testemunha", e.target.value)} placeholder="Nome da testemunha (se houver)" style={inputStyle}/>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Responsável</label>
            <input value={form.responsavel} onChange={e => setField("responsavel", e.target.value)} placeholder="Seu nome" style={inputStyle}/>
          </div>

          <button onClick={handleMelhorar} disabled={improving} style={{
            background: improving ? C.card : "rgba(26,111,212,0.15)",
            border: `1px solid ${improving ? C.border : C.blue}`,
            borderRadius: 9, padding: "13px",
            color: improving ? C.muted : C.blue,
            fontSize: 14, fontWeight: 800, cursor: improving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {improving ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Melhorando...</> : "✨ Melhorar escrita (IA)"}
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSalvar} style={btnStyle("rgba(34,197,94,0.12)", "rgba(34,197,94,0.4)", C.green)}>💾 Salvar</button>
            <button onClick={handleLimpar} style={btnStyle("rgba(239,68,68,0.1)", "rgba(239,68,68,0.3)", C.red)}>🗑 Limpar</button>
          </div>

          <button onClick={handleFinalizar} style={{
            background: C.blue, border: "none", borderRadius: 9, padding: "16px",
            color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(26,111,212,0.35)",
          }}>✅ Finalizar ocorrência</button>
        </div>
      )}

      {/* ── PRÉVIA ── */}
      {view === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.green}`, borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>Ocorrência gerada</div>
              <div style={{ color: C.muted, fontSize: 11 }}>Revise e envie</div>
            </div>
            <button onClick={() => setView("form")} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>← Editar</button>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px", color: C.text, fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {preview}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={handleCopiar} style={btnStyle("rgba(245,158,11,0.12)", "rgba(245,158,11,0.4)", C.amber)}>📋 Copiar</button>
            <button onClick={handleSalvar} style={btnStyle("rgba(34,197,94,0.12)", "rgba(34,197,94,0.4)", C.green)}>💾 Salvar</button>
          </div>
          <button onClick={handleWhatsApp} style={{ background: "#128C7E", border: "none", borderRadius: 9, padding: "15px", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
            Enviar no WhatsApp
          </button>
          <button onClick={handleLimpar} style={btnStyle("rgba(239,68,68,0.1)", "rgba(239,68,68,0.3)", C.red)}>🗑 Nova ocorrência</button>
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {view === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 24 }}>
          {saved.length === 0 ? (
            <div style={{ color: C.muted, textAlign: "center", padding: "40px 0", fontSize: 14 }}>Nenhuma ocorrência salva</div>
          ) : saved.map((oc, i) => (
            <div key={oc.id || i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{oc.data || "Sem data"} · {oc.local || "Sem local"}</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{oc.horaInicio}</span>
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>{oc.passageiro || "Passageiro não informado"} · {oc.responsavel}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(oc.texto || buildText(oc)); showToast("✓ Copiado!"); }} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", flex: 1 }}>📋 Copiar</button>
                <button onClick={() => window.open(`https://wa.me/${WHATSAPP_GROUP}?text=${encodeURIComponent(oc.texto || buildText(oc))}`, "_blank")} style={{ background: "rgba(18,140,126,0.15)", border: "1px solid rgba(18,140,126,0.4)", borderRadius: 6, padding: "6px 12px", color: "#25D366", fontSize: 11, fontWeight: 700, cursor: "pointer", flex: 1 }}>WhatsApp</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#1A2A3A", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 20px", color: C.white, fontSize: 13, fontWeight: 700, zIndex: 100, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      color: C.muted, fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 1.2,
      display: "flex", alignItems: "center", gap: 8, marginTop: 4,
    }}>
      <div style={{ height: 1, width: 12, background: C.border }}/>
      {children}
      <div style={{ height: 1, flex: 1, background: C.border }}/>
    </div>
  );
}

// ─── TELA DE CADASTRO ─────────────────────────────────────────────────────────
function RegisterScreen({ onRegister, loading }) {
  const [name, setName]         = useState("");
  const [platform, setPlatform] = useState("");
  const [error, setError]       = useState("");

  const submit = () => {
    const n = name.trim();
    if (!n)       { setError("Informe seu nome completo."); return; }
    if (!platform){ setError("Selecione sua plataforma."); return; }
    onRegister(n, platform);
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "32px 20px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 64, height: 64, borderRadius: 16,
          background: C.card, border: `1px solid ${C.border}`, marginBottom: 14,
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="8" width="24" height="16" rx="3" fill="#1A6FD4"/>
            <rect x="5" y="11" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
            <rect x="13" y="11" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
            <path d="M26 10 Q31 15 31 16 Q31 21 26 22 L26 10Z" fill="#1A6FD4"/>
            <circle cx="8"  cy="26" r="3" fill="#0F1520" stroke="#1A6FD4" strokeWidth="1.5"/>
            <circle cx="18" cy="26" r="3" fill="#0F1520" stroke="#1A6FD4" strokeWidth="1.5"/>
          </svg>
        </div>
        <h1 style={{ color: C.white, fontWeight: 900, fontSize: 22, margin: "0 0 4px" }}>Controle de Guarnição</h1>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Cadastro único — feito apenas uma vez</p>
      </div>

      <div style={{
        width: "100%", maxWidth: 420,
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: "28px 24px",
        display: "flex", flexDirection: "column", gap: 22,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ color: C.text, fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>NOME COMPLETO</label>
          <input
            value={name} onChange={e => { setName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Ex: Carlos Mendes" autoFocus
            style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "13px 14px",
              color: C.white, fontSize: 16, outline: "none", fontFamily: "inherit",
            }}
            onFocus={e => e.target.style.borderColor = C.blue}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ color: C.text, fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>SUA PLATAFORMA</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {PLATFORMS.map(p => {
              const active = platform === p.id;
              return (
                <button key={p.id} onClick={() => { setPlatform(p.id); setError(""); }} style={{
                  background: active ? `${p.color}18` : C.card,
                  border: `2px solid ${active ? p.color : C.border}`,
                  borderRadius: 10, padding: "14px 10px",
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 8, transition: "all 0.18s", outline: "none",
                }}>
                  <TrainIcon color={p.color} size={62} />
                  <span style={{ color: active ? p.color : C.muted, fontSize: 14, fontWeight: 800 }}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 6, padding: "9px 12px", color: C.red, fontSize: 13, fontWeight: 600,
          }}>⚠ {error}</div>
        )}

        <button onClick={submit} disabled={loading} style={{
          background: loading ? C.border : C.blue,
          border: "none", borderRadius: 9, padding: "15px",
          color: "white", fontSize: 15, fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "Conectando..." : "Confirmar e entrar"}
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, roster, onToggle, onChangePlatform, onLogout, connected }) {
  const [activeTab, setActiveTab] = useState("guarnicao");
  const me      = roster.find(u => u.name === user.name) || user;
  const myPlat  = PLATFORMS.find(p => p.id === me.platformId);
  const total   = roster.length;
  const atPost  = roster.filter(u => u.atPost).length;
  const absent  = total - atPost;
  const byPlat  = id => roster.filter(u => u.platformId === id);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 72 }}>

      {/* HEADER */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "14px 18px", position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px" }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="8" width="24" height="16" rx="3" fill="#1A6FD4"/>
                <rect x="5" y="11" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
                <rect x="13" y="11" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
                <path d="M26 10 Q31 15 31 16 Q31 21 26 22 L26 10Z" fill="#1A6FD4"/>
                <circle cx="8"  cy="26" r="3" fill="#0F1520" stroke="#1A6FD4" strokeWidth="1.5"/>
                <circle cx="18" cy="26" r="3" fill="#0F1520" stroke="#1A6FD4" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>Controle de Guarnição</div>
              <div style={{ color: C.muted, fontSize: 11 }}>
                {me.name} · <span style={{ color: myPlat?.color }}>{myPlat?.label}</span>
                {" "}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: connected ? C.green : C.amber }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? C.green : C.amber, display: "inline-block" }}/>
                  {connected ? "Ao vivo" : "Reconectando..."}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onLogout} style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "6px 12px",
            color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Sair</button>
        </div>

        {/* Stats — só visíveis na aba guarnição */}
        {activeTab === "guarnicao" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { label: "Total",    val: total,  color: C.text  },
              { label: "No posto", val: atPost, color: C.green },
              { label: "Fora",     val: absent, color: C.amber },
            ].map(s => (
              <div key={s.label} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "10px 8px", textAlign: "center",
              }}>
                <div style={{ color: s.color, fontWeight: 900, fontSize: 24, lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ABAS */}
      <div style={{
        display: "flex", background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: activeTab === "guarnicao" ? 147 : 83, zIndex: 19,
      }}>
        {[
          { key: "guarnicao",  label: "🚉 Guarnição"  },
          { key: "ocorrencia", label: "📋 Ocorrência" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: "13px 8px",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.key ? C.blue : "transparent"}`,
              color: activeTab === tab.key ? C.white : C.muted,
              fontSize: 13, fontWeight: 800, cursor: "pointer",
              transition: "all 0.15s", letterSpacing: 0.3,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      {activeTab === "guarnicao" && (
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* MINHA SITUAÇÃO */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${myPlat?.color || C.border}`,
            borderRadius: 10, padding: "18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  Minha situação
                </div>
                <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>{myPlat?.label}</div>
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "6px 14px", borderRadius: 7,
                background: me.atPost ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${me.atPost ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: me.atPost ? C.green : C.red, display: "inline-block" }}/>
                <span style={{ color: me.atPost ? C.green : C.red, fontWeight: 800, fontSize: 13 }}>
                  {me.atPost ? "No posto" : "Fora"}
                </span>
              </div>
            </div>
            <button
              onClick={() => onToggle(me.name)}
              style={{
                width: "100%",
                background: me.atPost ? "#7F1D1D" : "#14532D",
                border: `1px solid ${me.atPost ? C.red : C.green}`,
                borderRadius: 8, padding: "16px",
                color: me.atPost ? C.red : C.green,
                fontSize: 16, fontWeight: 800, cursor: "pointer",
                letterSpacing: 0.3, transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = me.atPost ? "#991B1B" : "#166534"}
              onMouseLeave={e => e.currentTarget.style.background = me.atPost ? "#7F1D1D" : "#14532D"}
            >
              {me.atPost ? "↩ Estou saindo do posto" : "↵ Voltei ao posto"}
            </button>
          </div>

          {/* GRID 2×2 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 2px" }}>
            <div style={{ height: 1, flex: 1, background: C.border }}/>
            <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>
              Plataformas — toque para selecionar
            </span>
            <div style={{ height: 1, flex: 1, background: C.border }}/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {PLATFORMS.map(p => (
              <PlatformSquare
                key={p.id} platform={p}
                agents={byPlat(p.id)}
                isMyPlatform={me.platformId === p.id}
                onSelect={() => onChangePlatform(me.name, p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === "ocorrencia" && (
        <OcorrenciaTab userName={me.name} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: ${C.bg}; }
        input, button, textarea { font-family: inherit; }
        input::placeholder, textarea::placeholder { color: #2A3548; }
        button:active { opacity: 0.82 !important; transform: scale(0.98); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        textarea { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,      setUser]      = useState(() => { try { return JSON.parse(localStorage.getItem("gn_user")) || null; } catch { return null; } });
  const [roster,    setRoster]    = useState([]);
  const [fbReady,   setFbReady]   = useState(false);
  const [connected, setConnected] = useState(false);
  const [fbError,   setFbError]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => {
    initFirebase()
      .then(db => {
        setFbReady(true);
        db.ref(".info/connected").on("value", snap => setConnected(!!snap.val()));
        const ref = db.ref("guarnicao/agentes");
        ref.on("value", snap => {
          const data = snap.val();
          if (data) {
            const arr = Object.values(data);
            setRoster(arr);
            setUser(prev => {
              if (!prev) return null;
              const updated = arr.find(u => u.name === prev.name);
              if (updated) { localStorage.setItem("gn_user", JSON.stringify(updated)); return updated; }
              return prev;
            });
          } else { setRoster([]); }
        });
        unsubRef.current = () => ref.off();
      })
      .catch(() => setFbError(true));
    return () => { unsubRef.current?.(); };
  }, []);

  const safeName = n => n.replace(/[.#$[\]/]/g, "_");

  const handleRegister = async (name, platformId) => {
    setLoading(true);
    const entry = { name, platformId, atPost: true };
    try {
      await dbRef(`guarnicao/agentes/${safeName(name)}`).set(entry);
      localStorage.setItem("gn_user", JSON.stringify(entry));
      setUser(entry);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleToggle = async name => {
    const agent = roster.find(u => u.name === name);
    if (!agent) return;
    await dbRef(`guarnicao/agentes/${safeName(name)}`).update({ atPost: !agent.atPost });
  };

  const handleChangePlatform = async (name, platformId) => {
    await dbRef(`guarnicao/agentes/${safeName(name)}`).update({ platformId });
  };

  const handleLogout = () => { setUser(null); localStorage.removeItem("gn_user"); };

  if (fbError) return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 32,
      fontFamily: "'Inter', system-ui, sans-serif", textAlign: "center", gap: 16,
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h2 style={{ color: C.red, margin: 0, fontWeight: 800 }}>Firebase não configurado</h2>
      <p style={{ color: C.muted, maxWidth: 360, lineHeight: 1.6 }}>
        Preencha as credenciais no topo do arquivo <code style={{ color: C.amber }}>FIREBASE_CONFIG</code>.
      </p>
      <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{
        background: C.blue, color: "white", padding: "12px 24px",
        borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 14,
      }}>Criar projeto Firebase →</a>
    </div>
  );

  if (!fbReady) return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ color: C.muted, fontSize: 14 }}>Conectando ao servidor...</div>
    </div>
  );

  if (!user) return <RegisterScreen onRegister={handleRegister} loading={loading} />;

  return (
    <Dashboard
      user={user} roster={roster}
      onToggle={handleToggle}
      onChangePlatform={handleChangePlatform}
      onLogout={handleLogout}
      connected={connected}
    />
  );
}
