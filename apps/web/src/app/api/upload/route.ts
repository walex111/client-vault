import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/r2";
import { db } from "@/db";
import { vaultFiles } from "@/db/schema";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vaultId, encryptedMetadata, fileSize } = body;

    if (!vaultId || !encryptedMetadata || !fileSize) {
      return NextResponse.json(
        { error: "Missing required upload parameters." },
        { status: 400 },
      );
    }

    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { error: "R2 bucket name not configured." },
        { status: 500 },
      );
    }

    const fileUUID = crypto.randomUUID();
    const r2Key = `vaults/${vaultId}/${fileUUID}.enc`;

    const [insertedFile] = await db
      .insert(vaultFiles)
      .values({
        vaultId,
        r2Key,
        encryptedMetadata, 
        fileSize,
      })
      .returning();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      ContentType: "application/octet-stream",
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });

    return NextResponse.json({
      fileId: insertedFile.id,
      uploadUrl,
      r2Key,
    });
  } catch (error) {
    console.error("Failed to generate presigned upload URL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
