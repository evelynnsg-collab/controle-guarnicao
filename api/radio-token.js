// api/radio-token.js - Gera token Agora RTC
// Se AGORA_APP_CERT não estiver configurado, retorna token null (modo testing)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const APP_ID   = "e4d415ef5c174f9394c9809ecbeff5cf";
  const APP_CERT = process.env.AGORA_APP_CERT;
  const CHANNEL  = "guarnicao-radio";

  // Se não tem certificado configurado, retorna token null
  // O Agora aceita token null quando o certificado está desativado no projeto
  if (!APP_CERT) {
    return res.status(200).json({ token: null, appId: APP_ID, channel: CHANNEL });
  }

  try {
    // Gera RTC Token v2
    const crypto = require("crypto");
    const uid    = 0;
    const role   = 1; // PUBLISHER
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1h

    // AccessToken2 structure
    const VERSION = "007";
    const salt    = Math.floor(Math.random() * 0xFFFFFFFF);
    const issuedTs = Math.floor(Date.now() / 1000);

    function packUint16(v) { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; }
    function packUint32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; }
    function packString(s) {
      const buf = Buffer.from(s, "utf8");
      return Buffer.concat([packUint16(buf.length), buf]);
    }

    // Privileges: join channel=1, publish audio=2, publish video=3, publish data=4
    const privMap = Buffer.concat([
      packUint16(4), // 4 entries
      packUint16(1), packUint32(expire), // join
      packUint16(2), packUint32(expire), // audio
      packUint16(3), packUint32(expire), // video
      packUint16(4), packUint32(expire), // data
    ]);

    const msg = Buffer.concat([
      packString(APP_ID),
      packUint32(issuedTs),
      packUint32(salt),
      packString(CHANNEL),
      packString(String(uid)),
      privMap,
    ]);

    const signature = crypto.createHmac("sha256", APP_CERT).update(msg).digest();
    const content   = Buffer.concat([signature, msg]);
    const token     = VERSION + Buffer.from(content).toString("base64");

    return res.status(200).json({ token, appId: APP_ID, channel: CHANNEL });
  } catch(e) {
    // Fallback: sem token
    return res.status(200).json({ token: null, appId: APP_ID, channel: CHANNEL });
  }
}
