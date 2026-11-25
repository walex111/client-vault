import { NextResponse } from "next/server";
import { db } from "@/db";
import { vaults } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, clientName } = body;

    if (!name || !clientName) {
      return NextResponse.json(
        { error: "Missing vault name or client name." },
        { status: 400 },
      );
    }

    const [newVault] = await db
      .insert(vaults)
      .values({
        name,
        clientName,
      })
      .returning();

    return NextResponse.json({
      vaultId: newVault.id,
      name: newVault.name,
      clientName: newVault.clientName,
    });
  } catch (error) {
    console.error("Failed to create vault:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
