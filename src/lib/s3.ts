import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_REGION ?? '';
const BUCKET = process.env.S3_BUCKET ?? '';
const PREFIX = process.env.S3_PREFIX ?? 'ar-models/';

function assertEnv(): void {
  if (!REGION) throw new Error('AWS_REGION이 설정되지 않았습니다.');
  if (!BUCKET) throw new Error('S3_BUCKET이 설정되지 않았습니다.');
  if (!process.env.AWS_ACCESS_KEY_ID) throw new Error('AWS_ACCESS_KEY_ID가 설정되지 않았습니다.');
  if (!process.env.AWS_SECRET_ACCESS_KEY) throw new Error('AWS_SECRET_ACCESS_KEY가 설정되지 않았습니다.');
}

function getCredentials(): { accessKeyId: string; secretAccessKey: string } {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS 자격증명이 설정되지 않았습니다.');
  }
  return { accessKeyId, secretAccessKey };
}

function getS3Client(): S3Client {
  assertEnv();
  return new S3Client({
    region: REGION,
    credentials: getCredentials(),
  });
}

export function getDefaultS3Prefix(): string {
  return PREFIX;
}

export function normalizeS3Key(key: string): string {
  // S3 key는 항상 prefix 하위에 있어야 합니다.
  const cleanPrefix = PREFIX.endsWith('/') ? PREFIX : `${PREFIX}/`;
  if (!key.startsWith(cleanPrefix)) return `${cleanPrefix}${key}`;
  return key;
}

export function buildArModelS3Key(objectKey: string): string {
  // admin에서 요청한 objectKey(대개 uuid.glb)만 prefix로 감쌉니다.
  const cleanPrefix = PREFIX.endsWith('/') ? PREFIX : `${PREFIX}/`;
  return `${cleanPrefix}${objectKey}`;
}

export async function getPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; key: string; expiresInSeconds: number }> {
  const { key, contentType } = params;
  const expiresInSeconds = params.expiresInSeconds ?? 600;
  const s3Key = normalizeS3Key(key);

  const s3 = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  return { uploadUrl, key: s3Key, expiresInSeconds };
}

export async function getPresignedDownloadUrl(params: {
  key: string;
  expiresInSeconds?: number;
}): Promise<{ url: string; key: string; expiresInSeconds: number }> {
  const { key } = params;
  const expiresInSeconds = params.expiresInSeconds ?? 600;
  const s3Key = normalizeS3Key(key);

  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  return { url, key: s3Key, expiresInSeconds };
}

export async function deleteS3Object(key: string): Promise<void> {
  const s3Key = normalizeS3Key(key);
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
}

