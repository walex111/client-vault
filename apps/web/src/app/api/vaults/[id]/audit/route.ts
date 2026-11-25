import { NextResponse } from "next/server";
import { db } from "@/db";
import { vaults, vaultFiles, auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const vaultId = params.id;

    const [vault] = await db
      .select()
      .from(vaults)
      .where(eq(vaults.id, vaultId));
    if (!vault) {
      return NextResponse.json({ error: "Vault not found." }, { status: 404 });
    }

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        ipHash: auditLogs.ipHash,
        createdAt: auditLogs.createdAt,
        fileId: vaultFiles.id,
        r2Key: vaultFiles.r2Key,
      })
      .from(auditLogs)
      .innerJoin(vaultFiles, eq(auditLogs.fileId, vaultFiles.id))
      .where(eq(vaultFiles.vaultId, vaultId))
      .orderBy(desc(auditLogs.createdAt));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
