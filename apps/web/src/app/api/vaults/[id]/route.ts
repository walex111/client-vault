import { NextResponse } from "next/server";
import { db } from "@/db";
import { vaults, vaultFiles } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      return NextResponse.json({ error: "Vault not found" }, { status: 404 });
    }

    const files = await db
      .select()
      .from(vaultFiles)
      .where(eq(vaultFiles.vaultId, vaultId));

    return NextResponse.json({ ...vault, files });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
