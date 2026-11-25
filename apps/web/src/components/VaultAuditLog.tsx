"use client";

import React, { useEffect, useState } from "react";

interface AuditLogEntry {
  id: string;
  action: string;
  ipHash: string | null;
  createdAt: string;
  fileId: string;
  r2Key: string;
}

interface VaultAuditLogProps {
  vaultId: string;
}

export function VaultAuditLog({ vaultId }: VaultAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/vaults/${vaultId}/audit`);
        if (!res.ok) throw new Error("Failed to load audit history.");
        const data = await res.json();
        setLogs(data.logs);
      } catch (err) {
        console.error(err);
        setError("Could not retrieve audit logs.");
      } finally {
        setLoading(false);
      }
    }

    if (vaultId) {
      fetchLogs();
    }
  }, [vaultId]);

  if (loading) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 font-mono text-xs">
        Loading audit trail...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-red-400 text-xs">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden text-zinc-100">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Vault Access Audit Trail
        </h3>
        <span className="text-xs text-zinc-500 font-mono">
          {logs.length} total events
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 text-xs">
          No view or download events recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 font-mono">
                <th className="p-3">Action</th>
                <th className="p-3">File Reference</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">IP Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-850/50 transition">
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        log.action === "DOWNLOAD"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400 truncate max-w-50">
                    {log.r2Key}
                  </td>
                  <td className="p-3 text-zinc-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-zinc-500">
                    {log.ipHash || "Anonymized"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
