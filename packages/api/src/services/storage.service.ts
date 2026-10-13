import { AwsClient } from "aws4fetch";

import { env } from "@rim-genie/env/server";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const VIEW_URL_TTL_SECONDS = 60 * 60;

let client: AwsClient | null = null;

function storage() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("File storage is not configured");
  }
  client ??= new AwsClient({
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    service: "s3",
    region: S3_REGION,
  });
  return { client, objectUrl: (key: string) => objectUrl(S3_ENDPOINT, S3_BUCKET, key) };
}

// Path-style addressing works for both Cloudflare R2 and MinIO.
function objectUrl(endpoint: string, bucket: string, key: string) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return new URL(`${endpoint.replace(/\/$/, "")}/${bucket}/${path}`);
}

async function presign(method: "GET" | "PUT", key: string, ttl: number, query = {}) {
  const { client, objectUrl } = storage();
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(ttl));
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, String(value));
  const signed = await client.sign(url, { method, aws: { signQuery: true } });
  return signed.url;
}

export function createUploadUrl(key: string) {
  return presign("PUT", key, UPLOAD_URL_TTL_SECONDS);
}

export function createViewUrl(key: string, download?: { fileName: string }) {
  return presign(
    "GET",
    key,
    VIEW_URL_TTL_SECONDS,
    download
      ? {
          "response-content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(download.fileName)}`,
        }
      : {},
  );
}

export async function headObject(key: string) {
  const { client, objectUrl } = storage();
  const res = await client.fetch(objectUrl(key), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Storage HEAD failed with ${res.status}`);
  return {
    size: Number(res.headers.get("content-length") ?? 0),
    contentType: res.headers.get("content-type"),
  };
}

export async function deleteObject(key: string) {
  const { client, objectUrl } = storage();
  const res = await client.fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Storage DELETE failed with ${res.status}`);
}
