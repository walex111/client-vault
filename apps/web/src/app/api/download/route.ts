import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/r2";
import { db } from "@/db";
import { vaultFiles, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");
    const action = url.searchParams.get("action") || "DOWNLOAD";

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    const [fileRecord] = await db
      .select()
      .from(vaultFiles)
      .where(eq(vaultFiles.id, fileId));
    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await db.insert(auditLogs).values({
      fileId: fileRecord.id,
      action,
    });

    const bucketName = process.env.R2_BUCKET_NAME;
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileRecord.r2Key,
    });

    const downloadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 300,
    });

    return NextResponse.json({
      downloadUrl,
      encryptedMetadata: fileRecord.encryptedMetadata,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
