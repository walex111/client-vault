import { describe, expect, test } from "bun:test";
import {
  generateVaultKey,
  importVaultKey,
  encryptBuffer,
  decryptBuffer,
} from "./crypto";

describe("Zero-Knowledge Web Crypto Engine", () => {
  test("encrypts and decrypts a payload end-to-end via exported URL key", async () => {
    const originalText = "Confidential architectural CAD spec v2";
    const encodedData = new TextEncoder().encode(originalText).buffer;

    const { cryptoKey, exportedKey } = await generateVaultKey();
    const encryptedPayload = await encryptBuffer(encodedData, cryptoKey);
    const encryptedPayloadBuffer = new Uint8Array(encryptedPayload).buffer;

    expect(encryptedPayload.byteLength).toBeGreaterThan(
      encodedData.byteLength + 12,
    );

    const importedKey = await importVaultKey(exportedKey);
    const decryptedBuffer = await decryptBuffer(
      encryptedPayloadBuffer,
      importedKey,
    );
    const decryptedText = new TextDecoder().decode(decryptedBuffer);

    expect(decryptedText).toBe(originalText);
  });

  test("rejects decryption if ciphertext is tampered with (GCM authentication check)", async () => {
    const encodedData = new TextEncoder().encode(
      "Protected deliverable",
    ).buffer;
    const { cryptoKey, exportedKey } = await generateVaultKey();
    const encryptedPayload = await encryptBuffer(encodedData, cryptoKey);

    encryptedPayload[encryptedPayload.byteLength - 1] ^= 255;

    const importedKey = await importVaultKey(exportedKey);

    expect(
      decryptBuffer(
        new Uint8Array(encryptedPayload).buffer as ArrayBuffer,
        importedKey,
      ),
    ).rejects.toThrow();
  });
});
