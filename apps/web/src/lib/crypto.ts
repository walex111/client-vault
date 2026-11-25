const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

export async function generateVaultKey(): Promise<{
  cryptoKey: CryptoKey;
  exportedKey: string;
}> {
  const cryptoKey = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );

  const rawKey = await crypto.subtle.exportKey("raw", cryptoKey);
  const exportedKey = bufferToBase64Url(new Uint8Array(rawKey));

  return { cryptoKey, exportedKey };
}

export async function importVaultKey(exportedKey: string): Promise<CryptoKey> {
  const rawKey = base64UrlToBuffer(exportedKey);
  const keyData = new ArrayBuffer(rawKey.byteLength);
  new Uint8Array(keyData).set(rawKey);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBuffer(
  data: ArrayBuffer,
  key: CryptoKey,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data,
  );

  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), IV_LENGTH);

  return combined;
}

export async function decryptBuffer(
  combinedData: ArrayBuffer,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const dataView = new Uint8Array(combinedData);
  if (dataView.byteLength <= IV_LENGTH) {
    throw new Error("Invalid encrypted payload: payload too short.");
  }

  const iv = dataView.slice(0, IV_LENGTH);
  const ciphertext = dataView.slice(IV_LENGTH);

  return crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
}

function bufferToBase64Url(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBuffer(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}
