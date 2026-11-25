"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { importVaultKey, decryptBuffer } from "@/lib/crypto";
import { Dropzone } from "@/components/Dropzone";

interface VaultFile {
  id: string;
  encryptedMetadata: string;
  fileSize: number;
  createdAt: string;
}

interface VaultData {
  id: string;
  name: string;
  clientName: string;
  files: VaultFile[];
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function ClientVaultPage() {
  const params = useParams();
  const vaultId = params.id as string;

  const [key, setKey] = useState<CryptoKey | null>(null);
  const [exportedKeyStr, setExportedKeyStr] = useState<string>("");
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [decryptingFileId, setDecryptingFileId] = useState<string | null>(null);

  useEffect(() => {
    async function initVault() {
      try {
        const hash = window.location.hash.replace("#", "");
        if (!hash) {
          setError(
            "Missing decryption key in URL fragment. Ensure your link includes the #key hash.",
          );
          setLoading(false);
          return;
        }

        setExportedKeyStr(hash);
        const cryptoKey = await importVaultKey(hash);
        setKey(cryptoKey);

        const res = await fetch(`/api/vaults/${vaultId}`);
        if (!res.ok) throw new Error("Vault not found or expired.");

        const data = await res.json();
        setVault(data);
      } catch (err) {
        console.error(err);
        setError(
          "Failed to initialize zero-knowledge vault. The link may be invalid.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (vaultId) {
      initVault();
    }
  }, [vaultId]);

  const handleDownloadFile = async (fileId: string) => {
    if (!key) return;
    setDecryptingFileId(fileId);

    try {
      const res = await fetch(`/api/download?fileId=${fileId}&action=DOWNLOAD`);
      if (!res.ok) throw new Error("Failed to retrieve file access URL.");

      const { downloadUrl, encryptedMetadata } = await res.json();

      const metaBytes = base64ToUint8(encryptedMetadata);
      const metaBuffer = new ArrayBuffer(metaBytes.byteLength);
      new Uint8Array(metaBuffer).set(metaBytes);
      const decryptedMetaBuffer = await decryptBuffer(metaBuffer, key);
      const metaJson = JSON.parse(
        new TextDecoder().decode(decryptedMetaBuffer),
      );

      const r2Res = await fetch(downloadUrl);
      if (!r2Res.ok)
        throw new Error("Failed to fetch ciphertext from R2 storage.");
      const encryptedBufferData = await r2Res.arrayBuffer();

      const decryptedFileBuffer = await decryptBuffer(encryptedBufferData, key);

      const blob = new Blob([decryptedFileBuffer], { type: metaJson.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = metaJson.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Decryption or download error:", err);
      alert(
        "Decryption failed. The key may be incorrect or the file was corrupted.",
      );
    } finally {
      setDecryptingFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono text-sm">
        Initializing zero-trust decryption environment...
      </div>
    );
  }

  if (error || !vault || !key) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-100">
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            {error || "Invalid vault configuration."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Vault Header */}
        <div className="border-b border-zinc-800 pb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1 rounded-full">
              Zero-Knowledge Client Portal
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              ID: {vault.id}
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-4 text-zinc-100">
            {vault.name}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Prepared for:{" "}
            <span className="text-zinc-200 font-medium">
              {vault.clientName}
            </span>
          </p>
        </div>

        {/* Upload Dropzone for Creator / Admin */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Add Deliverables
          </h3>
          <Dropzone
            vaultId={vault.id}
            exportedKey={exportedKeyStr}
            onUploadComplete={() => window.location.reload()}
          />
        </div>

        {/* File List & Decryption View */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Secure Deliverables
          </h3>
          {vault.files.length === 0 ? (
            <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl text-center text-zinc-500 text-sm">
              No files uploaded to this vault yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {vault.files.map((file) => (
                <div
                  key={file.id}
                  className="p-4 flex items-center justify-between hover:bg-zinc-850 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200 font-mono">
                      Encrypted Blob ({Math.round(file.fileSize / 1024)} KB)
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Uploaded {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(file.id)}
                    disabled={decryptingFileId === file.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    {decryptingFileId === file.id
                      ? "Decrypting..."
                      : "Decrypt & Download"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
