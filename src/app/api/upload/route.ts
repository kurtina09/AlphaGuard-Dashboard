import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set in .env.local");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return NextResponse.json({ error: "R2_BUCKET_NAME is not configured." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const subfolder = (formData.get("subfolder") as string | null)?.trim().replace(/^\/+|\/+$/g, "") ?? "";

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // Build the object key: subfolder/filename  (or just filename if no subfolder)
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const key = subfolder ? `${subfolder}/${safeName}` : safeName;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        ContentLength: buffer.length,
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true, key });
}

// Allow large uploads (up to 100 MB)
export const config = {
  api: { bodyParser: false },
};
