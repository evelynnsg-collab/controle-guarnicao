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

const WHATSAPP_GROUP = "5511999999999";

const PLATFORMS = [
  { id: "2/3", label: "Plataforma 2/3", short: "2/3", color: "#1A6FD4" },
  { id: "4/5", label: "Plataforma 4/5", short: "4/5", color: "#E07B00" },
  { id: "6/7", label: "Plataforma 6/7", short: "6/7", color: "#0D9B52" },
  { id: "8",   label: "Plataforma 8",   short: "8",   color: "#CC1F1F" },
];

const ADMIN_LOGIN = { user: "admin", pass: "admin@123" };

const C = {
  bg:"#080C12", surface:"#0F1520", card:"#131B28", border:"#1E2A3A",
  text:"#C8D4E8", muted:"#4A5568", white:"#EDF2FF",
  green:"#22C55E", amber:"#F59E0B", red:"#EF4444", blue:"#1A6FD4",
};

// ─── Firebase ────────────────────────────────────────────────────────────────
let _db = null, _fbReady = false;
async function initFirebase() {
  if (_fbReady) return _db;
  return new Promise((resolve, reject) => {
    const load = (src) => new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    Promise.all([
      load("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"),
      load("https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js"),
    ]).then(() => {
      if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
      _db = window.firebase.database(); _fbReady = true; resolve(_db);
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
  const present = agents.filter(a => a.atPost);
  const count = present.length, empty = count === 0;
  const coverColor = empty ? C.red : count === 1 ? C.amber : C.green;
  const coverLabel = empty ? "Sem cobertura" : count === 1 ? "Efetivo reduzido" : "Coberta";
  return (
    <button onClick={onSelect} style={{
      background: isMyPlatform ? `${platform.color}18` : C.card,
      border: `2px solid ${isMyPlatform ? platform.color : empty ? "rgba(239,68,68,0.45)" : C.border}`,
      borderRadius:14, padding:"16px 12px 14px", cursor:"pointer",
      display:"flex", flexDirection:"column", alignItems:"center", gap:0,
      transition:"all 0.18s", outline:"none", position:"relative", minHeight:190, textAlign:"center",
    }}>
      {isMyPlatform && <div style={{ position:"absolute", top:8, right:8, background:platform.color, borderRadius:4, padding:"2px 7px", fontSize:9, fontWeight:800, color:"#fff", textTransform:"uppercase", letterSpacing:0.8 }}>Minha</div>}
      <div style={{ marginBottom:10, opacity:empty?0.4:1 }}><TrainIcon color={platform.color} size={68}/></div>
      <div style={{ color:isMyPlatform?platform.color:C.white, fontWeight:800, fontSize:14, marginBottom:4, textTransform:"uppercase", letterSpacing:0.6 }}>{platform.label}</div>
      <div style={{ color:empty?C.red:platform.color, fontWeight:900, fontSize:38, lineHeight:1, marginBottom:2 }}>{count}</div>
      <div style={{ color:C.muted, fontSize:10, marginBottom:10, textTransform:"uppercase", letterSpacing:0.7 }}>{count===1?"agente":"agentes"}</div>
      <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:`${coverColor}18`, border:`1px solid ${coverColor}44`, borderRadius:5, padding:"3px 9px", marginBottom:10, fontSize:10, fontWeight:700, color:coverColor, textTransform:"uppercase", letterSpacing:0.7 }}>
        <span style={{ width:5, height:5, borderRadius:"50%", background:coverColor, display:"inline-block" }}/>{coverLabel}
      </div>
      {present.length > 0 && <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:3 }}>{present.map(a => <div key={a.name} style={{ background:`${platform.color}14`, border:`1px solid ${platform.color}30`, borderRadius:5, padding:"4px 8px", fontSize:11, color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name}</div>)}</div>}
      {empty && <div style={{ width:"100%", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:6, padding:"5px 8px", color:C.red, fontSize:10, fontWeight:700 }}>⚠ Sem guarnição</div>}
    </button>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
      <div style={{ height:1, width:12, background:C.border }}/>{children}<div style={{ height:1, flex:1, background:C.border }}/>
    </div>
  );
}

// ─── ABA RÁDIO PTT (Agora RTC) ───────────────────────────────────────────────
const AGORA_APP_ID = "e4d415ef5c174f9394c9809ecbeff5cf";
const AGORA_CHANNEL = "guarnicao-radio";

function RadioTab({ userName }) {
  const [status,   setStatus]   = useState("idle");
  const [speaking, setSpeaking] = useState(null);
  const [log,      setLog]      = useState([]);
  const [error,    setError]    = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const clientRef    = useRef(null);
  const localAudio   = useRef(null);
  const pressing     = useRef(false);

  const addLog = (name) => {
    const ts = new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    setLog(prev => [{name,ts,id:Date.now()},...prev].slice(0,20));
  };

  // Carrega SDK Agora
  useEffect(() => {
    const load = (src) => new Promise((res,rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    load("https://download.agora.io/sdk/release/AgoraRTC_N.js")
      .then(() => { setSdkReady(true); })
      .catch(() => setError("Falha ao carregar SDK de áudio."));
  }, []);

  // Entra no canal Agora
  useEffect(() => {
    if (!sdkReady) return;
    let mounted = true;

    const join = async () => {
      try {
        setStatus("connecting");
        const AgoraRTC = window.AgoraRTC;
        AgoraRTC.setLogLevel(4);

        const client = AgoraRTC.createClient({ mode:"rtc", codec:"opus" });
        clientRef.current = client;

        // Escuta quem está publicando áudio
        client.on("user-published", async (user, mediaType) => {
          if (mediaType === "audio") {
            await client.subscribe(user, "audio");
            user.audioTrack.play();
            if (mounted) setSpeaking(user.uid);
          }
        });

        client.on("user-unpublished", (user, mediaType) => {
          if (mediaType === "audio" && mounted) setSpeaking(null);
        });

        // Busca token do servidor (ou usa sem token se certificado desativado)
        let token = null;
        try {
          const r = await fetch(`/api/radio-token?uid=0`);
          if (r.ok) {
            const d = await r.json();
            token = d.token || null;
          }
        } catch { token = null; }

        // Usa nome como UID string
        await client.join(AGORA_APP_ID, AGORA_CHANNEL, token, userName);
        if (mounted) setStatus("ready");
      } catch(e) {
        if (mounted) {
          setError("Erro ao conectar: " + (e.message || e.code || String(e)));
          setStatus("idle");
        }
      }
    };

    join();

    return () => {
      mounted = false;
      if (localAudio.current) { localAudio.current.stop(); localAudio.current.close(); }
      clientRef.current?.leave().catch(()=>{});
    };
  }, [sdkReady, userName]);

  // Escuta via Firebase quem está falando (para mostrar nome)
  useEffect(() => {
    if (!_db) return;
    const ref = _db.ref("guarnicao/radio_talking");
    ref.on("value", snap => {
      const data = snap.val();
      if (data && data.name !== userName) {
        setSpeaking(data.name);
        setStatus(s => s === "ready" ? "listening" : s);
      } else if (!data) {
        setSpeaking(null);
        setStatus(s => s === "listening" ? "ready" : s);
      }
    });
    return () => ref.off();
  }, [_db]);

  const startTalking = async () => {
    if (pressing.current || status !== "ready") return;
    pressing.current = true;
    try {
      const AgoraRTC = window.AgoraRTC;
      const track = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "speech_low_quality",
        AEC: true, ANS: true, AGC: true,
      });
      localAudio.current = track;
      await clientRef.current.publish([track]);
      setStatus("talking");
      if (_db) _db.ref("guarnicao/radio_talking").set({ name: userName, ts: Date.now() });
      addLog(userName);
    } catch(e) {
      setError("Microfone bloqueado. Permita o acesso ao microfone.");
      pressing.current = false;
    }
  };

  const stopTalking = async () => {
    if (!pressing.current) return;
    pressing.current = false;
    try {
      if (localAudio.current) {
        await clientRef.current.unpublish([localAudio.current]);
        localAudio.current.stop();
        localAudio.current.close();
        localAudio.current = null;
      }
      if (_db) _db.ref("guarnicao/radio_talking").remove();
      setStatus("ready");
    } catch(e) { console.error(e); }
  };

  const isOnline = status === "ready" || status === "talking" || status === "listening";
  const pttColor = status==="talking" ? C.green : status==="listening" ? C.amber : status==="ready" ? C.blue : C.muted;
  const pttBg    = status==="talking" ? "rgba(34,197,94,0.15)" : status==="listening" ? "rgba(245,158,11,0.1)" : status==="ready" ? "rgba(26,111,212,0.12)" : C.card;
  const pttLabel = status==="talking" ? "🎙 TRANSMITINDO..." : status==="listening" ? `📻 ${speaking||"Alguém"} está falando...` : status==="ready" ? "Segure para falar" : status==="connecting" ? "Conectando ao canal..." : "Aguardando SDK...";

  return (
    <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:14, paddingBottom:40 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.green}`, borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ color:C.white, fontWeight:800, fontSize:15 }}>📻 Canal Guarnição</div>
          <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>Push-to-talk · Voz em tempo real</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:6, background:isOnline?"rgba(34,197,94,0.1)":"rgba(74,85,104,0.2)", border:`1px solid ${isOnline?"rgba(34,197,94,0.3)":C.border}` }}>
          <span style={{ width:7, height:7, borderRadius:"50%", display:"inline-block", background:isOnline?C.green:C.muted }}/>
          <span style={{ fontSize:11, fontWeight:700, color:isOnline?C.green:C.muted }}>{isOnline?"Online":"Offline"}</span>
        </div>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"12px 14px", color:C.red, fontSize:13, fontWeight:600, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>⚠ {error}</span>
          <button onClick={()=>setError("")} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:16 }}>×</button>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:"20px 0" }}>
        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {(status==="talking"||status==="listening") && <>
            <div style={{ position:"absolute", width:170, height:170, borderRadius:"50%", border:`2px solid ${pttColor}`, opacity:0.35, animation:"ringPulse 1.2s ease-out infinite" }}/>
            <div style={{ position:"absolute", width:148, height:148, borderRadius:"50%", border:`2px solid ${pttColor}`, opacity:0.2, animation:"ringPulse 1.2s ease-out infinite 0.4s" }}/>
          </>}
          <button
            onPointerDown={startTalking}
            onPointerUp={stopTalking}
            onPointerLeave={stopTalking}
            disabled={status!=="ready"}
            style={{
              width:128, height:128, borderRadius:"50%",
              background:pttBg,
              border:`3px solid ${pttColor}`,
              cursor:status==="ready"?"pointer":"not-allowed",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6,
              transition:"all 0.15s",
              boxShadow:status==="talking"?`0 0 40px ${pttColor}66`:"none",
              outline:"none", userSelect:"none", WebkitUserSelect:"none", touchAction:"none",
            }}>
            <span style={{ fontSize:40 }}>{status==="listening"?"📻":"🎙"}</span>
            <span style={{ color:pttColor, fontSize:9, fontWeight:900, textTransform:"uppercase", letterSpacing:1 }}>
              {status==="talking"?"SOLTE":"SEGURE"}
            </span>
          </button>
        </div>

        <div style={{ color:pttColor, fontSize:14, fontWeight:700, textAlign:"center", minHeight:22, animation:status==="talking"?"blink 1s infinite":"none" }}>
          {pttLabel}
        </div>
        {status==="ready" && (
          <div style={{ color:C.muted, fontSize:12, textAlign:"center", maxWidth:220, lineHeight:1.5 }}>
            Segure o botão enquanto fala.<br/>Solte para liberar o canal.
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>Histórico do canal</div>
          {log.map(l => (
            <div key={l.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:7, padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>🎙 {l.name}</span>
              <span style={{ color:C.muted, fontSize:11 }}>{l.ts}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes ringPulse { 0%{transform:scale(1);opacity:0.35} 100%{transform:scale(1.4);opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}

// ─── ABA OCORRÊNCIA ───────────────────────────────────────────────────────────
function OcorrenciaTab({ userName }) {
  const today = new Date().toLocaleDateString("pt-BR");
  const empty = { data:today, horaInicio:"", horaFim:"", local:"", passageiro:"", cpf:"", endereco:"", telefone:"", ocorrencia:"", encaminhamento:"", testemunha:"", situacaoFinal:"", responsavel:userName||"" };
  const [form, setForm]         = useState(empty);
  const [preview, setPreview]   = useState("");
  const [toast, setToast]       = useState("");
  const [saved, setSaved]       = useState(() => { try { return JSON.parse(localStorage.getItem("gn_ocorrencias"))||[]; } catch { return []; } });
  const [view, setView]         = useState("form");
  const [melhorando, setMelhorando] = useState({}); // { ocorrencia: bool, encaminhamento: bool, situacaoFinal: bool }

  const setField = (key, val) => setForm(p => ({...p,[key]:val}));
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const buildText = (d) => `REGISTRO DE OCORRÊNCIA

Data: ${d.data||"—"}
Horário início: ${d.horaInicio||"—"}
Horário término: ${d.horaFim||"—"}
Local: ${d.local||"—"}

Passageiro(a): ${d.passageiro||"—"}
CPF: ${d.cpf||"—"}
Endereço: ${d.endereco||"—"}
Telefone: ${d.telefone||"—"}

Ocorrência: ${d.ocorrencia||"—"}

Encaminhamento: ${d.encaminhamento||"—"}

Testemunha: ${d.testemunha||"—"}

Situação final: ${d.situacaoFinal||"—"}

Responsável: ${d.responsavel||"—"}`;
  const handleFinalizar = () => { setPreview(buildText(form)); setView("preview"); };
  const handleCopiar    = () => { navigator.clipboard.writeText(preview).then(()=>showToast("✓ Copiado!")); };
  const handleWhatsApp  = () => { window.open(`https://wa.me/${WHATSAPP_GROUP}?text=${encodeURIComponent(preview)}`,"_blank"); };
  const handleSalvar    = () => { const e={...form,id:Date.now(),texto:preview||buildText(form)}; const u=[e,...saved].slice(0,50); setSaved(u); localStorage.setItem("gn_ocorrencias",JSON.stringify(u)); showToast("✓ Salvo!"); };
  const handleLimpar    = () => { setForm({...empty,data:today,responsavel:userName||""}); setPreview(""); setView("form"); showToast("Formulário limpo."); };

  // ✨ Melhora um campo específico usando Claude API
  const melhorarCampo = async (campo) => {
    const texto = form[campo];
    if (!texto || !texto.trim()) { showToast("Preencha o campo antes de melhorar."); return; }
    setMelhorando(p => ({...p, [campo]:true}));
    try {
      const prompts = {
        ocorrencia:     "Você é um assistente de escrita para relatórios operacionais ferroviários. Reescreva o seguinte relato de ocorrência de forma mais clara, objetiva e profissional, usando linguagem formal adequada para documentação oficial. Mantenha todos os fatos. Retorne APENAS o texto reescrito, sem comentários:",
        encaminhamento: "Você é um assistente de escrita para relatórios operacionais ferroviários. Reescreva o seguinte encaminhamento de forma mais clara, objetiva e profissional, usando linguagem formal. Mantenha todas as ações descritas. Retorne APENAS o texto reescrito, sem comentários:",
        situacaoFinal:  "Você é um assistente de escrita para relatórios operacionais ferroviários. Reescreva a seguinte situação final de forma mais clara, objetiva e profissional, usando linguagem formal. Mantenha o desfecho descrito. Retorne APENAS o texto reescrito, sem comentários:",
      };

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 500,
          messages: [{ role:"user", content: prompts[campo] + "

" + texto }],
        }),
      });

      if (!resp.ok) throw new Error("API error " + resp.status);
      const data = await resp.json();
      const melhorado = data.content?.find(b => b.type === "text")?.text?.trim();
      if (melhorado) {
        setField(campo, melhorado);
        showToast("✓ Escrita melhorada!");
      } else {
        throw new Error("Resposta vazia");
      }
    } catch(e) {
      showToast("Erro ao melhorar. Tente novamente.");
    }
    setMelhorando(p => ({...p, [campo]:false}));
  };

  const inp = { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"13px 14px", color:C.white, fontSize:15, outline:"none", fontFamily:"inherit", width:"100%", lineHeight:1.5, boxSizing:"border-box" };
  const ta  = {...inp, resize:"vertical"};
  const lbl = { color:C.text, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8 };
  const fw  = { display:"flex", flexDirection:"column", gap:6 };
  const btn = (bg,br,co) => ({ background:bg, border:`1px solid ${br}`, borderRadius:9, padding:"13px 14px", color:co, fontSize:14, fontWeight:800, cursor:"pointer", flex:1 });



  return (
    <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:0 }}>
      <div style={{ display:"flex", gap:0, marginBottom:16, background:C.card, borderRadius:10, padding:4 }}>
        {[{key:"form",label:"Formulário"},{key:"preview",label:"Prévia",disabled:!preview},{key:"history",label:`Histórico (${saved.length})`}].map(tab => (
          <button key={tab.key} disabled={tab.disabled} onClick={()=>!tab.disabled&&setView(tab.key)} style={{ flex:1, padding:"9px 6px", background:view===tab.key?C.surface:"transparent", border:view===tab.key?`1px solid ${C.border}`:"1px solid transparent", borderRadius:8, color:tab.disabled?C.muted:view===tab.key?C.white:C.muted, fontSize:12, fontWeight:700, cursor:tab.disabled?"not-allowed":"pointer" }}>{tab.label}</button>
        ))}
      </div>

      {view==="form" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14, paddingBottom:24 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.blue}`, borderRadius:10, padding:"14px 16px" }}>
            <div style={{ color:C.white, fontWeight:900, fontSize:16 }}>REGISTRO DE OCORRÊNCIA</div>
            <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>Preencha os campos e toque em Finalizar</div>
          </div>
          <SectionLabel>📅 Dados da ocorrência</SectionLabel>
          <div style={fw}><label style={lbl}>Data</label><input value={form.data} onChange={e=>setField("data",e.target.value)} placeholder="Ex: 20/06/2026" style={inp}/></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={fw}><label style={lbl}>Horário início</label><input value={form.horaInicio} onChange={e=>setField("horaInicio",e.target.value)} placeholder="Ex: 14:30" style={inp}/></div>
            <div style={fw}><label style={lbl}>Horário término</label><input value={form.horaFim} onChange={e=>setField("horaFim",e.target.value)} placeholder="Ex: 15:10" style={inp}/></div>
          </div>
          <div style={fw}><label style={lbl}>Local</label><input value={form.local} onChange={e=>setField("local",e.target.value)} placeholder="Ex: Plataforma 4/5" style={inp}/></div>
          <SectionLabel>👤 Dados do passageiro</SectionLabel>
          <div style={fw}><label style={lbl}>Passageiro(a)</label><input value={form.passageiro} onChange={e=>setField("passageiro",e.target.value)} placeholder="Nome completo" style={inp}/></div>
          <div style={fw}><label style={lbl}>CPF</label><input value={form.cpf} onChange={e=>setField("cpf",e.target.value)} placeholder="000.000.000-00" style={inp}/></div>
          <div style={fw}><label style={lbl}>Endereço</label><input value={form.endereco} onChange={e=>setField("endereco",e.target.value)} placeholder="Rua, número, bairro" style={inp}/></div>
          <div style={fw}><label style={lbl}>Telefone</label><input value={form.telefone} onChange={e=>setField("telefone",e.target.value)} placeholder="(11) 9 0000-0000" style={inp}/></div>
          <SectionLabel>📋 Relato</SectionLabel>
          <div style={fw}>
            <label style={lbl}>Ocorrência</label>
            <textarea value={form.ocorrencia} onChange={e=>setField("ocorrencia",e.target.value)} placeholder="Descreva o que aconteceu..." rows={5} style={{...ta}}/>
            <button
              onClick={()=>melhorarCampo("ocorrencia")}
              disabled={melhorando.ocorrencia}
              style={{
                marginTop:6,
                background:melhorando.ocorrencia?"rgba(139,92,246,0.06)":"rgba(139,92,246,0.18)",
                border:"1px solid rgba(139,92,246,0.6)",
                borderRadius:8,
                padding:"11px 14px",
                color:melhorando.ocorrencia?C.muted:"#C4B5FD",
                fontSize:13,
                fontWeight:800,
                cursor:melhorando.ocorrencia?"not-allowed":"pointer",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:8,
                fontFamily:"inherit",
                width:"100%",
                letterSpacing:0.3,
              }}>
              {melhorando.ocorrencia
                ? <><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>&nbsp;Melhorando com IA...</>
                : <>✨&nbsp;Melhorar escrita com IA</>
              }
            </button>
          </div>
          <div style={fw}>
            <label style={lbl}>Encaminhamento</label>
            <textarea value={form.encaminhamento} onChange={e=>setField("encaminhamento",e.target.value)} placeholder="Medidas tomadas, acionamentos..." rows={4} style={{...ta}}/>
            <button
              onClick={()=>melhorarCampo("encaminhamento")}
              disabled={melhorando.encaminhamento}
              style={{
                marginTop:6,
                background:melhorando.encaminhamento?"rgba(139,92,246,0.06)":"rgba(139,92,246,0.18)",
                border:"1px solid rgba(139,92,246,0.6)",
                borderRadius:8,
                padding:"11px 14px",
                color:melhorando.encaminhamento?C.muted:"#C4B5FD",
                fontSize:13,
                fontWeight:800,
                cursor:melhorando.encaminhamento?"not-allowed":"pointer",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:8,
                fontFamily:"inherit",
                width:"100%",
                letterSpacing:0.3,
              }}>
              {melhorando.encaminhamento
                ? <><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>&nbsp;Melhorando com IA...</>
                : <>✨&nbsp;Melhorar escrita com IA</>
              }
            </button>
          </div>
          <div style={fw}>
            <label style={lbl}>Situação final</label>
            <textarea value={form.situacaoFinal} onChange={e=>setField("situacaoFinal",e.target.value)} placeholder="Como foi encerrada..." rows={3} style={{...ta}}/>
            <button
              onClick={()=>melhorarCampo("situacaoFinal")}
              disabled={melhorando.situacaoFinal}
              style={{
                marginTop:6,
                background:melhorando.situacaoFinal?"rgba(139,92,246,0.06)":"rgba(139,92,246,0.18)",
                border:"1px solid rgba(139,92,246,0.6)",
                borderRadius:8,
                padding:"11px 14px",
                color:melhorando.situacaoFinal?C.muted:"#C4B5FD",
                fontSize:13,
                fontWeight:800,
                cursor:melhorando.situacaoFinal?"not-allowed":"pointer",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:8,
                fontFamily:"inherit",
                width:"100%",
                letterSpacing:0.3,
              }}>
              {melhorando.situacaoFinal
                ? <><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>&nbsp;Melhorando com IA...</>
                : <>✨&nbsp;Melhorar escrita com IA</>
              }
            </button>
          </div>
          <SectionLabel>✍️ Encerramento</SectionLabel>
          <div style={fw}><label style={lbl}>Testemunha</label><input value={form.testemunha} onChange={e=>setField("testemunha",e.target.value)} placeholder="Nome da testemunha" style={inp}/></div>
          <div style={fw}><label style={lbl}>Responsável</label><input value={form.responsavel} onChange={e=>setField("responsavel",e.target.value)} placeholder="Seu nome" style={inp}/></div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleSalvar} style={btn("rgba(34,197,94,0.12)","rgba(34,197,94,0.4)",C.green)}>💾 Salvar</button>
            <button onClick={handleLimpar} style={btn("rgba(239,68,68,0.1)","rgba(239,68,68,0.3)",C.red)}>🗑 Limpar</button>
          </div>
          <button onClick={handleFinalizar} style={{ background:C.blue, border:"none", borderRadius:9, padding:"16px", color:"white", fontSize:16, fontWeight:900, cursor:"pointer" }}>✅ Finalizar ocorrência</button>
        </div>
      )}

      {view==="preview" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14, paddingBottom:24 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.green}`, borderRadius:10, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div><div style={{ color:C.white, fontWeight:800, fontSize:15 }}>Ocorrência gerada</div><div style={{ color:C.muted, fontSize:11 }}>Revise e envie</div></div>
            <button onClick={()=>setView("form")} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 12px", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer" }}>← Editar</button>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px", color:C.text, fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap", fontFamily:"monospace" }}>{preview}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button onClick={handleCopiar} style={btn("rgba(245,158,11,0.12)","rgba(245,158,11,0.4)",C.amber)}>📋 Copiar</button>
            <button onClick={handleSalvar} style={btn("rgba(34,197,94,0.12)","rgba(34,197,94,0.4)",C.green)}>💾 Salvar</button>
          </div>
          <button onClick={handleWhatsApp} style={{ background:"#128C7E", border:"none", borderRadius:9, padding:"15px", color:"white", fontSize:15, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
            Enviar no WhatsApp
          </button>
          <button onClick={handleLimpar} style={btn("rgba(239,68,68,0.1)","rgba(239,68,68,0.3)",C.red)}>🗑 Nova ocorrência</button>
        </div>
      )}

      {view==="history" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12, paddingBottom:24 }}>
          {saved.length===0 ? <div style={{ color:C.muted, textAlign:"center", padding:"40px 0", fontSize:14 }}>Nenhuma ocorrência salva</div>
          : saved.map((oc,i) => (
            <div key={oc.id||i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ color:C.white, fontWeight:700, fontSize:13 }}>{oc.data||"Sem data"} · {oc.local||"Sem local"}</span><span style={{ color:C.muted, fontSize:11 }}>{oc.horaInicio}</span></div>
              <div style={{ color:C.muted, fontSize:12, marginBottom:10 }}>{oc.passageiro||"Passageiro não informado"} · {oc.responsavel}</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>{navigator.clipboard.writeText(oc.texto||buildText(oc));showToast("✓ Copiado!");}} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 12px", color:C.muted, fontSize:11, fontWeight:600, cursor:"pointer", flex:1 }}>📋 Copiar</button>
                <button onClick={()=>window.open(`https://wa.me/${WHATSAPP_GROUP}?text=${encodeURIComponent(oc.texto||buildText(oc))}`,"_blank")} style={{ background:"rgba(18,140,126,0.15)", border:"1px solid rgba(18,140,126,0.4)", borderRadius:6, padding:"6px 12px", color:"#25D366", fontSize:11, fontWeight:700, cursor:"pointer", flex:1 }}>WhatsApp</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"#1A2A3A", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 20px", color:C.white, fontSize:13, fontWeight:700, zIndex:100, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>{toast}</div>}
    </div>
  );
}

// ─── ABA ADMIN - ESCALA ───────────────────────────────────────────────────────
const POSTOS_CONFIG = [
  { id:"sso",      label:"SSO / Apoio linha de bloqueios",          cafe_offset:0,  almoco_offset:0  },
  { id:"bloq1",    label:"Linha de bloqueios",                       cafe_offset:30, almoco_offset:60 },
  { id:"bloq2",    label:"Linha de bloqueios",                       cafe_offset:0,  almoco_offset:0  },
  { id:"bloq3",    label:"Linha de bloqueios",                       cafe_offset:30, almoco_offset:60 },
  { id:"apoio",    label:"Apoio linha de bloqueios",                 cafe_offset:0,  almoco_offset:0  },
  { id:"mez1",     label:"Mezanino / Ronda espaço cultural",         cafe_offset:0,  almoco_offset:30 },
  { id:"mez2",     label:"Mezanino / Ronda espaço cultural",         cafe_offset:30, almoco_offset:90 },
  { id:"plat67a",  label:"Plataforma 6 e 7 / Ronda plataforma 8",   cafe_offset:0,  almoco_offset:30 },
  { id:"plat67b",  label:"Plataforma 6 e 7 / Ronda plataforma 8",   cafe_offset:30, almoco_offset:90 },
  { id:"plat3a",   label:"Plataforma 3",                             cafe_offset:30, almoco_offset:90 },
  { id:"plat3b",   label:"Plataforma 3",                             cafe_offset:0,  almoco_offset:30 },
  { id:"plat34",   label:"Plataforma 3 / Após café plataforma 4",   cafe_offset:30, almoco_offset:60 },
  { id:"ronda1",   label:"Apoiar postos / Ronda área livre",         cafe_offset:60, almoco_offset:120},
  { id:"ronda2",   label:"Apoiar postos / Ronda área livre",         cafe_offset:30, almoco_offset:60 },
];

function fmtHora(baseMin, offsetMin) {
  const t = baseMin + offsetMin;
  const h = Math.floor(t/60).toString().padStart(2,"0");
  const m = (t%60).toString().padStart(2,"0");
  return h + ":" + m;
}

// Gera escala com revezamento de postos
function gerarEscala(colaboradores, postoOffset = 0) {
  const ativos = colaboradores.filter(c => c.trabalha);
  const total = ativos.length;
  if (total === 0) return [];

  // Revezamento: cada colaborador pega um posto diferente a cada geração
  const postosUsados = POSTOS_CONFIG.slice(0, total);

  return ativos.map((c, i) => {
    const postoIdx = (i + postoOffset) % POSTOS_CONFIG.length;
    const posto = POSTOS_CONFIG[postoIdx];
    const cafeBase  = 8 * 60; // 08:00
    const almocoBase = 10 * 60; // 10:00
    const cafeInicio  = fmtHora(cafeBase,  posto.cafe_offset);
    const cafeFim     = fmtHora(cafeBase,  posto.cafe_offset + 30);
    const almocoInicio = fmtHora(almocoBase, posto.almoco_offset);
    const almocoFim    = fmtHora(almocoBase, posto.almoco_offset + 60);
    return {
      nome: c.nome,
      posto: posto.label,
      cafe: `${cafeInicio} às ${cafeFim}`,
      almoco: `${almocoInicio} às ${almocoFim}`,
    };
  });
}

function AdminTab() {
  const [authed, setAuthed]       = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [mes, setMes] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;
  });
  const [colaboradores, setColaboradores] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gn_colaboradores")) || []; } catch { return []; }
  });
  const [novoNome, setNovoNome] = useState("");
  const [escala, setEscala]     = useState([]);
  const [postoOffset, setPostoOffset] = useState(() => {
    return parseInt(localStorage.getItem("gn_posto_offset") || "0");
  });
  const [view, setView]         = useState("colaboradores");
  const [toast, setToast]       = useState("");
  const [importando, setImportando] = useState(false);
  const [previewImagem, setPreviewImagem] = useState(null);
  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };
  const saveColabs = (list) => { setColaboradores(list); localStorage.setItem("gn_colaboradores", JSON.stringify(list)); };

  const handleLogin = () => {
    if (loginUser === ADMIN_LOGIN.user && loginPass === ADMIN_LOGIN.pass) { setAuthed(true); setLoginError(""); }
    else setLoginError("Login ou senha incorretos.");
  };

  const addColaborador = () => {
    const n = novoNome.trim();
    if (!n) return;
    if (colaboradores.find(c => c.nome.toLowerCase() === n.toLowerCase())) { showToast("Colaborador já existe."); return; }
    saveColabs([...colaboradores, { nome:n, trabalha:true }]);
    setNovoNome("");
  };

  const toggleTrabalha = (nome) => {
    saveColabs(colaboradores.map(c => c.nome===nome ? {...c,trabalha:!c.trabalha} : c));
  };

  const remover = (nome) => { saveColabs(colaboradores.filter(c=>c.nome!==nome)); };

  // Importa Excel da escala e lê T/F via SheetJS
  const handleImportarExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);

    try {
      // Carrega SheetJS dinamicamente
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      // Detecta coluna de nomes e coluna T/F
      // Espera: primeira coluna = nomes, segunda ou mais = T/F por dia
      // Ignora linhas de cabeçalho (sem nome ou nome = "Colaborador", etc)
      const colaboradoresLidos = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const nome = String(row[0] || "").trim();
        if (!nome || nome.toLowerCase().includes("colaborador") || nome.toLowerCase().includes("nome") || nome.length < 2) continue;
        
        // Verifica se há alguma célula T ou F na linha
        let trabalha = true; // padrão: trabalha
        let encontrouTF = false;
        
        for (let j = 1; j < row.length; j++) {
          const cell = String(row[j] || "").trim().toUpperCase();
          if (cell === "T") { trabalha = true; encontrouTF = true; break; }
          if (cell === "F") { trabalha = false; encontrouTF = true; break; }
        }
        
        // Se não encontrou T/F explícito, verifica se tem algum conteúdo
        if (!encontrouTF) {
          const temConteudo = row.slice(1).some(c => String(c||"").trim() !== "");
          trabalha = temConteudo;
        }
        
        colaboradoresLidos.push({ nome, trabalha });
      }

      if (colaboradoresLidos.length === 0) {
        showToast("Nenhum colaborador encontrado. Verifique o formato do Excel.");
      } else {
        saveColabs(colaboradoresLidos);
        const t = colaboradoresLidos.filter(c=>c.trabalha).length;
        const f = colaboradoresLidos.filter(c=>!c.trabalha).length;
        showToast(`✓ ${colaboradoresLidos.length} colaboradores importados! ${t} trabalham, ${f} de folga.`);
      }
    } catch(err) {
      showToast("Erro ao ler Excel: " + err.message);
    }
    setImportando(false);
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  // Importa foto da escala e reconhece T/F via Claude API
  const handleImportarFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setPreviewImagem(URL.createObjectURL(file));

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const mediaType = file.type || "image/jpeg";

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: `Esta é uma escala de trabalho. Analise a tabela e retorne um JSON:
{"colaboradores": [{"nome": "Nome", "trabalha": true/false}]}

Regras:
- T = trabalha: true
- F ou vazio = trabalha: false
- Retorne APENAS o JSON` }
            ]
          }]
        })
      });

      const data = await resp.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.colaboradores && Array.isArray(parsed.colaboradores)) {
        const novos = parsed.colaboradores.map(c => ({
          nome: c.nome,
          trabalha: c.trabalha === true || c.trabalha === "true"
        }));
        saveColabs(novos);
        const t = novos.filter(c=>c.trabalha).length;
        const f = novos.filter(c=>!c.trabalha).length;
        showToast(`✓ ${novos.length} importados! ${t} trabalham, ${f} de folga.`);
      } else {
        showToast("Não foi possível ler a escala. Tente outra foto.");
      }
    } catch(err) {
      showToast("Erro ao processar imagem.");
    }
    setImportando(false);
  };

  const gerarEscalaClick = () => {
    const e = gerarEscala(colaboradores, postoOffset);
    setEscala(e);
    setView("escala");
    const novoOffset = (postoOffset + 1) % POSTOS_CONFIG.length;
    setPostoOffset(novoOffset);
    localStorage.setItem("gn_posto_offset", String(novoOffset));
    if (_db) {
      dbRef(`guarnicao/escala/${mes.replace("-","_")}`).set({ mes, gerada: new Date().toISOString(), dados: e });
    }
    showToast("✓ Escala gerada com revezamento!");
  };

  const copiarEscala = () => {
    const txt = `ESCALA DE POSTOS - 06:00 ÀS 14:20\nMês: ${mes}\n\n` +
      escala.map(e => `${e.nome}\n  Posto: ${e.posto}\n  Café: ${e.cafe}\n  Almoço: ${e.almoco}`).join("\n\n");
    navigator.clipboard.writeText(txt).then(()=>showToast("✓ Escala copiada!"));
  };

  const enviarWhatsApp = () => {
    const txt = `ESCALA DE POSTOS - 06:00 ÀS 14:20\nMês: ${mes}\n\n` +
      escala.map(e => `${e.nome}: ${e.posto} | Café: ${e.cafe} | Almoço: ${e.almoco}`).join("\n");
    window.open(`https://wa.me/${WHATSAPP_GROUP}?text=${encodeURIComponent(txt)}`,"_blank");
  };

  const inp = { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px", color:C.white, fontSize:15, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };

  if (!authed) return (
    <div style={{ padding:"32px 16px", display:"flex", flexDirection:"column", gap:16, alignItems:"center" }}>
      <div style={{ textAlign:"center", marginBottom:8 }}>
        <div style={{ fontSize:40 }}>🔐</div>
        <div style={{ color:C.white, fontWeight:800, fontSize:18, marginTop:8 }}>Área do Administrador</div>
        <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>Acesso restrito</div>
      </div>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:12 }}>
        <input value={loginUser} onChange={e=>setLoginUser(e.target.value)} placeholder="Usuário" style={inp}/>
        <input value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="Senha" type="password" style={inp} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        {loginError && <div style={{ color:C.red, fontSize:13, fontWeight:600 }}>⚠ {loginError}</div>}
        <button onClick={handleLogin} style={{ background:C.blue, border:"none", borderRadius:9, padding:"14px", color:"white", fontSize:15, fontWeight:800, cursor:"pointer" }}>Entrar</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:14, paddingBottom:40 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.blue}`, borderRadius:10, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><div style={{ color:C.white, fontWeight:800, fontSize:15 }}>⚙ Administrador</div><div style={{ color:C.muted, fontSize:11 }}>Gestão de escala · Turno 06:00–14:20</div></div>
        <button onClick={()=>setAuthed(false)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 10px", color:C.muted, fontSize:11, cursor:"pointer" }}>Sair</button>
      </div>

      {/* Sub-abas */}
      <div style={{ display:"flex", gap:0, background:C.card, borderRadius:10, padding:4 }}>
        {[{key:"colaboradores",label:"👥 Equipe"},{key:"escala",label:"📅 Escala",disabled:escala.length===0}].map(tab => (
          <button key={tab.key} disabled={tab.disabled} onClick={()=>!tab.disabled&&setView(tab.key)} style={{ flex:1, padding:"9px 6px", background:view===tab.key?C.surface:"transparent", border:view===tab.key?`1px solid ${C.border}`:"1px solid transparent", borderRadius:8, color:tab.disabled?C.muted:view===tab.key?C.white:C.muted, fontSize:12, fontWeight:700, cursor:tab.disabled?"not-allowed":"pointer" }}>{tab.label}</button>
        ))}
      </div>

      {view==="colaboradores" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Mês */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={{ color:C.text, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8 }}>Mês de referência</label>
            <input type="month" value={mes} onChange={e=>setMes(e.target.value)} style={inp}/>
          </div>

          {/* Importar foto da escala */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ color:C.white, fontWeight:700, fontSize:14 }}>📂 Importar escala</div>
            <div style={{ color:C.muted, fontSize:12, lineHeight:1.5 }}>
              Importe via <strong style={{color:C.green}}>Excel</strong> (.xlsx/.xls) ou <strong style={{color:C.amber}}>foto</strong>. O sistema lê automaticamente <strong style={{color:C.green}}>T</strong> (trabalha) e <strong style={{color:C.red}}>F</strong> (folga).
            </div>

            {previewImagem && (
              <img src={previewImagem} alt="Preview" style={{ width:"100%", borderRadius:8, border:`1px solid ${C.border}`, maxHeight:160, objectFit:"contain" }}/>
            )}

            <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportarExcel} style={{ display:"none" }}/>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImportarFoto} style={{ display:"none" }}/>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <button
                onClick={()=>excelInputRef.current?.click()}
                disabled={importando}
                style={{ background:importando?"rgba(13,155,82,0.05)":"rgba(13,155,82,0.12)", border:`1px solid ${importando?C.border:"rgba(13,155,82,0.5)"}`, borderRadius:8, padding:"13px 8px", color:importando?C.muted:C.green, fontSize:13, fontWeight:800, cursor:importando?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                {importando ? <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span></> : "📊"} Excel / CSV
              </button>
              <button
                onClick={()=>fileInputRef.current?.click()}
                disabled={importando}
                style={{ background:importando?"rgba(26,111,212,0.05)":"rgba(26,111,212,0.12)", border:`1px solid ${importando?C.border:C.blue}`, borderRadius:8, padding:"13px 8px", color:importando?C.muted:C.blue, fontSize:13, fontWeight:800, cursor:importando?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                {importando ? <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span></> : "📷"} Foto
              </button>
            </div>
          </div>

          {/* Adicionar colaborador manualmente */}
          <div style={{ display:"flex", gap:8 }}>
            <input value={novoNome} onChange={e=>setNovoNome(e.target.value)} placeholder="Adicionar colaborador manualmente" style={{...inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&addColaborador()}/>
            <button onClick={addColaborador} style={{ background:C.blue, border:"none", borderRadius:8, padding:"12px 16px", color:"white", fontSize:14, fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>+ Add</button>
          </div>

          {/* Lista colaboradores */}
          {colaboradores.length===0 ? (
            <div style={{ color:C.muted, textAlign:"center", padding:"24px 0", fontSize:13 }}>Importe uma foto ou adicione manualmente</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ color:C.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>
                  {colaboradores.filter(c=>c.trabalha).length} trabalhando · {colaboradores.filter(c=>!c.trabalha).length} de folga
                </div>
                <div style={{ color:C.muted, fontSize:10 }}>Revezamento #{postoOffset+1}</div>
              </div>
              {colaboradores.map(c => (
                <div key={c.nome} style={{ background:C.card, border:`1px solid ${c.trabalha?C.border:"rgba(239,68,68,0.3)"}`, borderRadius:9, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                  <button onClick={()=>toggleTrabalha(c.nome)} style={{ width:28, height:28, borderRadius:6, border:`2px solid ${c.trabalha?C.green:C.red}`, background:c.trabalha?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.1)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:13, fontWeight:900, color:c.trabalha?C.green:C.red }}>
                    {c.trabalha ? "T" : "F"}
                  </button>
                  <span style={{ color:c.trabalha?C.white:C.muted, fontWeight:600, fontSize:14, flex:1, textDecoration:c.trabalha?"none":"line-through" }}>{c.nome}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:c.trabalha?C.green:C.red, textTransform:"uppercase" }}>{c.trabalha?"Trabalha":"Folga"}</span>
                  <button onClick={()=>remover(c.nome)} style={{ background:"transparent", border:"none", color:C.muted, fontSize:18, cursor:"pointer", padding:"0 4px" }}>×</button>
                </div>
              ))}
            </div>
          )}

          {colaboradores.filter(c=>c.trabalha).length > 0 && (
            <button onClick={gerarEscalaClick} style={{ background:"linear-gradient(135deg,#1A6FD4,#0D9B52)", border:"none", borderRadius:9, padding:"16px", color:"white", fontSize:16, fontWeight:900, cursor:"pointer", boxShadow:"0 4px 20px rgba(26,111,212,0.3)" }}>
              ⚡ Gerar escala com revezamento
            </button>
          )}
        </div>
      )}

      {view==="escala" && escala.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ color:C.white, fontWeight:700, fontSize:14 }}>📋 Escala de Postos</div>
            <div style={{ color:C.muted, fontSize:12 }}>{mes} · {escala.length} colaboradores</div>
          </div>

          {escala.map((e,i) => (
            <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.blue}`, borderRadius:10, padding:"14px 16px" }}>
              <div style={{ color:C.white, fontWeight:800, fontSize:15, marginBottom:8 }}>{e.nome}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                  <span style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", minWidth:56, paddingTop:1 }}>Posto</span>
                  <span style={{ color:C.text, fontSize:13, flex:1, fontWeight:600 }}>{e.posto}</span>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", minWidth:56 }}>Café</span>
                  <span style={{ color:C.amber, fontSize:13, fontWeight:700 }}>☕ {e.cafe}</span>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", minWidth:56 }}>Almoço</span>
                  <span style={{ color:C.green, fontSize:13, fontWeight:700 }}>🍽 {e.almoco}</span>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button onClick={copiarEscala} style={{ background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.4)", borderRadius:9, padding:"13px", color:C.amber, fontSize:14, fontWeight:800, cursor:"pointer" }}>📋 Copiar</button>
            <button onClick={enviarWhatsApp} style={{ background:"rgba(18,140,126,0.15)", border:"1px solid rgba(18,140,126,0.4)", borderRadius:9, padding:"13px", color:"#25D366", fontSize:14, fontWeight:800, cursor:"pointer" }}>📲 WhatsApp</button>
          </div>
          <button onClick={()=>setView("colaboradores")} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:9, padding:"12px", color:C.muted, fontSize:13, fontWeight:700, cursor:"pointer" }}>← Editar equipe</button>
        </div>
      )}

      {toast && <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"#1A2A3A", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 20px", color:C.white, fontSize:13, fontWeight:700, zIndex:100, whiteSpace:"nowrap", maxWidth:"90vw", textAlign:"center" }}>{toast}</div>}
    </div>
  );
}



// ─── TELA DE CADASTRO ─────────────────────────────────────────────────────────
function RegisterScreen({ onRegister, loading }) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    const n = name.trim();
    if (!n) { setError("Informe seu nome completo."); return; }
    if (!platform) { setError("Selecione sua plataforma."); return; }
    onRegister(n, platform);
  };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px", fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:64, height:64, borderRadius:16, background:C.card, border:`1px solid ${C.border}`, marginBottom:14 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="2" y="8" width="24" height="16" rx="3" fill="#1A6FD4"/><rect x="5" y="11" width="5" height="5" rx="1" fill="white" opacity="0.9"/><rect x="13" y="11" width="5" height="5" rx="1" fill="white" opacity="0.9"/><path d="M26 10 Q31 15 31 16 Q31 21 26 22 L26 10Z" fill="#1A6FD4"/><circle cx="8" cy="26" r="3" fill="#0F1520" stroke="#1A6FD4" strokeWidth="1.5"/><circle cx="18" cy="26" r="3" fill="#0F1520" stroke="#1A6FD4" strokeWidth="1.5"/></svg>
        </div>
        <h1 style={{ color:C.white, fontWeight:900, fontSize:22, margin:"0 0 4px" }}>Controle de Guarnição</h1>
        <p style={{ color:C.muted, fontSize:13, margin:0 }}>Cadastro único — feito apenas uma vez</p>
      </div>
      <div style={{ width:"100%", maxWidth:420, background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"28px 24px", display:"flex", flexDirection:"column", gap:22 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <label style={{ color:C.text, fontSize:13, fontWeight:700, letterSpacing:0.3 }}>NOME COMPLETO</label>
          <input value={name} onChange={e=>{setName(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Ex: Carlos Mendes" autoFocus style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"13px 14px", color:C.white, fontSize:16, outline:"none", fontFamily:"inherit" }} onFocus={e=>e.target.style.borderColor="#1A6FD4"} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <label style={{ color:C.text, fontSize:13, fontWeight:700, letterSpacing:0.3 }}>SUA PLATAFORMA</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {PLATFORMS.map(p => { const active=platform===p.id; return (
              <button key={p.id} onClick={()=>{setPlatform(p.id);setError("");}} style={{ background:active?`${p.color}18`:C.card, border:`2px solid ${active?p.color:C.border}`, borderRadius:10, padding:"14px 10px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"all 0.18s", outline:"none" }}>
                <TrainIcon color={p.color} size={62}/>
                <span style={{ color:active?p.color:C.muted, fontSize:14, fontWeight:800 }}>{p.label}</span>
              </button>
            ); })}
          </div>
        </div>
        {error && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:6, padding:"9px 12px", color:C.red, fontSize:13, fontWeight:600 }}>⚠ {error}</div>}
        <button onClick={submit} disabled={loading} style={{ background:loading?C.border:C.blue, border:"none", borderRadius:9, padding:"15px", color:"white", fontSize:15, fontWeight:800, cursor:loading?"not-allowed":"pointer" }}>{loading?"Conectando...":"Confirmar e entrar"}</button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, roster, onToggle, onChangePlatform, onLogout, connected }) {
  const [activeTab, setActiveTab] = useState("guarnicao");
  const me = roster.find(u=>u.name===user.name)||user;
  const myPlat = PLATFORMS.find(p=>p.id===me.platformId);
  const total = roster.length, atPost = roster.filter(u=>u.atPost).length, absent = total-atPost;
  const byPlat = id => roster.filter(u=>u.platformId===id);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Inter', system-ui, sans-serif", paddingBottom:72 }}>
      {/* HEADER */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"14px 18px", position:"sticky", top:0, zIndex:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px" }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect x="2" y="8" width="24" height="16" rx="3" fill="#1A6FD4"/><rect x="5" y="11" width="5" height="5" rx="1" fill="white" opacity="0.9"/><rect x="13" y="11" width="5" height="5" rx="1" fill="white" opacity="0.9"/><path d="M26 10 Q31 15 31 16 Q31 21 26 22 L26 10Z" fill="#1A6FD4"/><circle cx="8" cy="26" r="3" fill="#0F1520" stroke="#1A6FD4" strokeWidth="1.5"/><circle cx="18" cy="26" r="3" fill="#0F1520" stroke="#1A6FD4" strokeWidth="1.5"/></svg>
            </div>
            <div>
              <div style={{ color:C.white, fontWeight:800, fontSize:15 }}>Controle de Guarnição</div>
              <div style={{ color:C.muted, fontSize:11 }}>{me.name} · <span style={{ color:myPlat?.color }}>{myPlat?.label}</span> <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:10, color:connected?C.green:C.amber }}><span style={{ width:5, height:5, borderRadius:"50%", background:connected?C.green:C.amber, display:"inline-block" }}/>{connected?"Ao vivo":"Reconectando..."}</span></div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 12px", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer" }}>Sair</button>
        </div>
        {activeTab==="guarnicao" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[{label:"Total",val:total,color:C.text},{label:"No posto",val:atPost,color:C.green},{label:"Fora",val:absent,color:C.amber}].map(s => (
              <div key={s.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ color:s.color, fontWeight:900, fontSize:24, lineHeight:1 }}>{s.val}</div>
                <div style={{ color:C.muted, fontSize:10, marginTop:3, textTransform:"uppercase", letterSpacing:0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ABAS */}
      <div style={{ display:"flex", background:C.surface, borderBottom:`1px solid ${C.border}`, position:"sticky", top:activeTab==="guarnicao"?147:83, zIndex:19 }}>
        {[{key:"guarnicao",label:"🚉 Guarnição"},{key:"ocorrencia",label:"📋 Ocorrência"},{key:"radio",label:"📻 Rádio"},{key:"admin",label:"⚙ Admin"}].map(tab => (
          <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{ flex:1, padding:"13px 4px", background:"transparent", border:"none", borderBottom:`2px solid ${activeTab===tab.key?C.blue:"transparent"}`, color:activeTab===tab.key?C.white:C.muted, fontSize:11, fontWeight:800, cursor:"pointer", transition:"all 0.15s" }}>{tab.label}</button>
        ))}
      </div>

      {/* CONTEÚDO */}
      {activeTab==="guarnicao" && (
        <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${myPlat?.color||C.border}`, borderRadius:10, padding:"18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div><div style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Minha situação</div><div style={{ color:C.white, fontWeight:800, fontSize:15 }}>{myPlat?.label}</div></div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"6px 14px", borderRadius:7, background:me.atPost?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", border:`1px solid ${me.atPost?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}` }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:me.atPost?C.green:C.red, display:"inline-block" }}/>
                <span style={{ color:me.atPost?C.green:C.red, fontWeight:800, fontSize:13 }}>{me.atPost?"No posto":"Fora"}</span>
              </div>
            </div>
            <button onClick={()=>onToggle(me.name)} style={{ width:"100%", background:me.atPost?"#7F1D1D":"#14532D", border:`1px solid ${me.atPost?C.red:C.green}`, borderRadius:8, padding:"16px", color:me.atPost?C.red:C.green, fontSize:16, fontWeight:800, cursor:"pointer", letterSpacing:0.3 }}>
              {me.atPost?"↩ Estou saindo do posto":"↵ Voltei ao posto"}
            </button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0 2px" }}>
            <div style={{ height:1, flex:1, background:C.border }}/><span style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2 }}>Plataformas — toque para selecionar</span><div style={{ height:1, flex:1, background:C.border }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {PLATFORMS.map(p => <PlatformSquare key={p.id} platform={p} agents={byPlat(p.id)} isMyPlatform={me.platformId===p.id} onSelect={()=>onChangePlatform(me.name,p.id)}/>)}
          </div>
        </div>
      )}
      {activeTab==="ocorrencia" && <OcorrenciaTab userName={me.name}/>}
      {activeTab==="radio" && <RadioTab userName={me.name}/>}
      {activeTab==="admin" && <AdminTab/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        html,body{margin:0;padding:0;background:${C.bg}}
        input,button,textarea{font-family:inherit}
        input::placeholder,textarea::placeholder{color:#2A3548}
        button:active{opacity:0.85!important;transform:scale(0.98)}
        textarea{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
      `}</style>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser] = useState(()=>{try{return JSON.parse(localStorage.getItem("gn_user"))||null;}catch{return null;}});
  const [roster,setRoster] = useState([]);
  const [fbReady,setFbReady] = useState(false);
  const [connected,setConnected] = useState(false);
  const [fbError,setFbError] = useState(false);
  const [loading,setLoading] = useState(false);
  const unsubRef = useRef(null);

  useEffect(()=>{
    initFirebase().then(db=>{
      setFbReady(true);
      db.ref(".info/connected").on("value",snap=>setConnected(!!snap.val()));
      const ref=db.ref("guarnicao/agentes");
      ref.on("value",snap=>{
        const data=snap.val();
        if(data){const arr=Object.values(data);setRoster(arr);setUser(prev=>{if(!prev)return null;const updated=arr.find(u=>u.name===prev.name);if(updated){localStorage.setItem("gn_user",JSON.stringify(updated));return updated;}return prev;});}
        else setRoster([]);
      });
      unsubRef.current=()=>ref.off();
    }).catch(()=>setFbError(true));
    return()=>{unsubRef.current?.();};
  },[]);

  const safeName=n=>n.replace(/[.#$[\]/]/g,"_");
  const handleRegister=async(name,platformId)=>{setLoading(true);const entry={name,platformId,atPost:true};try{await dbRef(`guarnicao/agentes/${safeName(name)}`).set(entry);localStorage.setItem("gn_user",JSON.stringify(entry));setUser(entry);}catch(e){console.error(e);}setLoading(false);};
  const handleToggle=async name=>{const agent=roster.find(u=>u.name===name);if(!agent)return;await dbRef(`guarnicao/agentes/${safeName(name)}`).update({atPost:!agent.atPost});};
  const handleChangePlatform=async(name,platformId)=>{await dbRef(`guarnicao/agentes/${safeName(name)}`).update({platformId});};
  const handleLogout=()=>{setUser(null);localStorage.removeItem("gn_user");};

  if(fbError)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,fontFamily:"'Inter',system-ui,sans-serif",textAlign:"center",gap:16}}><div style={{fontSize:40}}>⚠️</div><h2 style={{color:C.red,margin:0,fontWeight:800}}>Firebase não configurado</h2><p style={{color:C.muted,maxWidth:360,lineHeight:1.6}}>Preencha as credenciais no topo do arquivo.</p><a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{background:C.blue,color:"white",padding:"12px 24px",borderRadius:8,textDecoration:"none",fontWeight:700,fontSize:14}}>Criar projeto Firebase →</a></div>);
  if(!fbReady)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',system-ui,sans-serif"}}><div style={{color:C.muted,fontSize:14}}>Conectando ao servidor...</div></div>);
  if(!user)return<RegisterScreen onRegister={handleRegister} loading={loading}/>;
  return<Dashboard user={user} roster={roster} onToggle={handleToggle} onChangePlatform={handleChangePlatform} onLogout={handleLogout} connected={connected}/>;
}
