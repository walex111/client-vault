"use client";

import React, { useState } from "react";
import { generateVaultKey } from "@/lib/crypto";

export function CreateVaultForm() {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { exportedKey } = await generateVaultKey();

      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clientName }),
      });

      if (!res.ok) throw new Error("Failed to create vault record.");

      const data = await res.json();
      const vaultId = data.vaultId;

      const origin = window.location.origin;
      const link = `${origin}/v/${vaultId}#${exportedKey}`;

      setShareableLink(link);
    } catch (err) {
      console.error(err);
      alert("Error creating vault.");
    } finally {
      setLoading(false);
    }
  };

  if (shareableLink) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg mx-auto text-zinc-100">
        <h3 className="text-lg font-semibold mb-2">
          Vault Created Successfully
        </h3>
        <p className="text-sm text-zinc-400 mb-4">
          Copy this secure link and send it to your client. The decryption key
          is embedded in the hash fragment and will never touch our servers.
        </p>
        <input
          type="text"
          readOnly
          value={shareableLink}
          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-emerald-400 text-xs font-mono select-all mb-4"
        />
        <button
          onClick={() => navigator.clipboard.writeText(shareableLink)}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition"
        >
          Copy Secure Link
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg mx-auto text-zinc-100 space-y-4"
    >
      <h3 className="text-lg font-semibold">Create New Client Vault</h3>
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">
          Project Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Architectural Phase 1 Deliverables"
          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase mb-1">
          Client Name / Organization
        </label>
        <input
          type="text"
          required
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="e.g. Acme Corporation"
          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg transition disabled:opacity-50"
      >
        {loading
          ? "Initializing Zero-Knowledge Vault..."
          : "Create Vault & Generate Key"}
      </button>
    </form>
  );
}
