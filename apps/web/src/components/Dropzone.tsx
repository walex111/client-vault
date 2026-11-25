"use client";

import React, { useState, useCallback } from "react";
import { importVaultKey, encryptBuffer } from "@/lib/crypto";

interface DropzoneProps {
  vaultId: string;
  exportedKey: string;
  onUploadComplete?: (fileId: string) => void;
}

type UploadStatus = "idle" | "encrypting" | "uploading" | "done" | "error";

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function Dropzone({
  vaultId,
  exportedKey,
  onUploadComplete,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const processAndUploadFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setErrorMessage("");
      setStatus("encrypting");

      try {
        const cryptoKey = await importVaultKey(exportedKey);

        const metadataJson = JSON.stringify({
          name: file.name,
          type: file.type || "application/octet-stream",
        });
        const metadataBuffer = new TextEncoder().encode(metadataJson).buffer;
        const encryptedMetaBytes = await encryptBuffer(
          metadataBuffer,
          cryptoKey,
        );
        const encryptedMetadata = uint8ToBase64(encryptedMetaBytes);

        const fileBuffer = await file.arrayBuffer();
        const encryptedFileBytes = await encryptBuffer(fileBuffer, cryptoKey);

        setStatus("uploading");

        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultId,
            encryptedMetadata,
            fileSize: encryptedFileBytes.byteLength,
          }),
        });

        if (!presignRes.ok) {
          throw new Error("Failed to obtain presigned upload URL.");
        }

        const { fileId, uploadUrl } = await presignRes.json();

        const uploadBody = new ArrayBuffer(encryptedFileBytes.byteLength);
        new Uint8Array(uploadBody).set(encryptedFileBytes);

        const r2Res = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: uploadBody,
        });

        if (!r2Res.ok) {
          throw new Error("Direct upload to Cloudflare R2 failed.");
        }

        setStatus("done");
        onUploadComplete?.(fileId);
      } catch (err) {
        console.error("Zero-knowledge upload error:", err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Encryption or upload failed.",
        );
      }
    },
    [vaultId, exportedKey, onUploadComplete],
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processAndUploadFile(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processAndUploadFile(selectedFile);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
        isDragging
          ? "border-emerald-400 bg-zinc-900/80"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
      }`}
    >
      <input
        type="file"
        onChange={handleFileInput}
        disabled={status === "encrypting" || status === "uploading"}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      <div className="space-y-2 pointer-events-none">
        {status === "idle" && (
          <>
            <p className="text-sm font-medium text-zinc-200">
              Drop a file here or click to select
            </p>
            <p className="text-xs text-zinc-500">
              Encrypted locally with AES-256-GCM before leaving your browser
            </p>
          </>
        )}

        {status === "encrypting" && (
          <p className="text-sm font-mono text-amber-400 animate-pulse">
            Encrypting &ldquo;{fileName}&rdquo; in browser memory...
          </p>
        )}

        {status === "uploading" && (
          <p className="text-sm font-mono text-emerald-400 animate-pulse">
            Streaming ciphertext directly to Cloudflare R2...
          </p>
        )}

        {status === "done" && (
          <>
            <p className="text-sm font-medium text-emerald-400">
              Encrypted &amp; stored: {fileName}
            </p>
            <p className="text-xs text-zinc-500">
              Drop another file to add to this vault
            </p>
          </>
        )}

        {status === "error" && (
          <p className="text-sm text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
