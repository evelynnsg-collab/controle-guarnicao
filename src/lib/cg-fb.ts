/**
 * Shared cloud sync for Controle de Guarnição, backed by the same Firebase
 * Realtime Database used by GAI-EFETIVO — stored under its own path
 * (/controle-guarnicao) so the two apps never collide. Data is encrypted
 * client-side (AES-256-GCM) before it leaves the device, same approach as
 * GAI-EFETIVO, since the database itself has no auth in front of it.
 */

const FB_BASE = "https://gai-efetivo-default-rtdb.firebaseio.com";
const FB_ROOT = "controle-guarnicao";

const CRYPTO_KEY_RAW = "CONTROLE-GUARNICAO-CPTM-2026-CHAVE-SECRETA-AES256";

let cryptoKeyPromise: Promise<CryptoKey> | null = null;
function getCryptoKey(): Promise<CryptoKey> {
  if (!cryptoKeyPromise) {
    cryptoKeyPromise = (async () => {
      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(CRYPTO_KEY_RAW),
        { name: "PBKDF2" },
        false,
        ["deriveKey"],
      );
      return window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode("cg-salt-2026"), iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    })();
  }
  return cryptoKeyPromise;
}

async function encrypt(data: unknown): Promise<string | null> {
  try {
    const key = await getCryptoKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(JSON.stringify(data)),
    );
    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);
    let binary = "";
    combined.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  } catch {
    return null;
  }
}

async function decrypt(b64: string): Promise<unknown | null> {
  try {
    const key = await getCryptoKey();
    const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plain = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

/** Fetch a collection (object of id -> encrypted value) and decrypt every entry. */
export async function fbGetMap<T>(path: string): Promise<Record<string, T>> {
  try {
    const res = await fetch(`${FB_BASE}/${FB_ROOT}/${path}.json`);
    if (!res.ok) return {};
    const raw = (await res.json()) as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, T> = {};
    await Promise.all(
      Object.entries(raw).map(async ([id, v]) => {
        const dec = typeof v === "string" ? await decrypt(v) : v;
        if (dec != null) out[id] = dec as T;
      }),
    );
    return out;
  } catch {
    return {};
  }
}

/** Write a single child, encrypted. */
export async function fbSetChild(path: string, value: unknown): Promise<void> {
  try {
    const encrypted = await encrypt(value);
    if (!encrypted) return;
    await fetch(`${FB_BASE}/${FB_ROOT}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(encrypted),
    });
  } catch {
    /* best-effort; local state already has the change */
  }
}

/** Write a whole collection at once (id -> value), encrypting each entry. */
export async function fbSetMap<T>(path: string, map: Record<string, T>): Promise<void> {
  try {
    const entries = await Promise.all(
      Object.entries(map).map(async ([id, v]) => [id, await encrypt(v)] as const),
    );
    const body: Record<string, string> = {};
    entries.forEach(([id, enc]) => {
      if (enc) body[id] = enc;
    });
    await fetch(`${FB_BASE}/${FB_ROOT}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* best-effort */
  }
}

export async function fbDeleteChild(path: string): Promise<void> {
  try {
    await fetch(`${FB_BASE}/${FB_ROOT}/${path}.json`, { method: "DELETE" });
  } catch {
    /* best-effort */
  }
}
