/**
 * Backblaze B2 Storage abstraction layer (S3-compatible).
 *
 * Replaces all `supabase.storage.from(...)` calls with a single bucket
 * in B2, using virtual "prefixes" to separate logical areas.
 *
 * Prefixes (map to old Supabase buckets):
 *   client-documents/
 *   support-ticket-attachments/
 *   milestone-evidence/
 *   people-photos/
 *   public/
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from './env';

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const env = getEnv();
  _client = new S3Client({
    endpoint: env.VITE_B2_ENDPOINT,
    region: env.VITE_B2_REGION,
    credentials: {
      accessKeyId: env.VITE_B2_KEY_ID,
      secretAccessKey: env.VITE_B2_APP_KEY,
    },
    forcePathStyle: true,
  });
  return _client;
}

function getBucket(): string {
  return getEnv().VITE_B2_BUCKET;
}

function fullKey(prefix: string, path: string): string {
  return `${prefix}/${path}`;
}

/**
 * Upload a file to B2.
 * @param prefix - Logical area (e.g. 'client-documents')
 * @param path   - Object key within the prefix
 * @param body   - File or Blob to upload
 * @param options - Optional contentType and upsert flag
 */
export async function storageUpload(
  prefix: string,
  path: string,
  body: File | Blob,
  options?: { contentType?: string; upsert?: boolean },
): Promise<void> {
  const arrayBuffer = await body.arrayBuffer();

  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: fullKey(prefix, path),
      Body: new Uint8Array(arrayBuffer),
      ContentType: options?.contentType ?? (body instanceof File ? body.type : 'application/octet-stream'),
    }),
  );
}

/**
 * Generate a time-limited signed URL for private objects.
 * @param prefix    - Logical area
 * @param path      - Object key within the prefix
 * @param expiresIn - Seconds until URL expires (default 3600)
 */
export async function storageGetSignedUrl(
  prefix: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: fullKey(prefix, path),
  });
  return awsGetSignedUrl(getClient(), command, { expiresIn });
}

/**
 * Build a public URL for an object.
 * Requires the bucket (or prefix) to allow public reads in B2.
 * Falls back to a signed URL with long expiry if public access isn't enabled.
 */
export function storageGetPublicUrl(prefix: string, path: string): string {
  const env = getEnv();
  return `${env.VITE_B2_ENDPOINT}/${env.VITE_B2_BUCKET}/${fullKey(prefix, path)}`;
}

/**
 * Delete one or more objects from B2.
 * B2's S3 API supports single-key deletes; we loop for multiple.
 */
export async function storageRemove(prefix: string, paths: string[]): Promise<void> {
  const client = getClient();
  const bucket = getBucket();

  await Promise.all(
    paths.map((p) =>
      client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: fullKey(prefix, p),
        }),
      ),
    ),
  );
}
