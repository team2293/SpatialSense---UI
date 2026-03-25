// ─── S3 Service ──────────────────────────────────────────────
// Handles listing and downloading PLY files from AWS S3.
// Once awsConfig.js is filled in, this is fully functional.

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  AWS_REGION,
  AWS_BUCKET_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  SCANS_PREFIX,
} from './awsConfig';
import { DEV_MODE } from './scannerApi';

let s3Client = null;

function getClient() {
  if (!s3Client) {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || AWS_BUCKET_NAME === 'YOUR-BUCKET-NAME') {
      throw new Error('AWS credentials not configured — update src/services/awsConfig.js');
    }
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

// ─── List Scans ──────────────────────────────────────────────
// Returns an array of scan objects from S3 that the dashboard can display.
// Each object: { id, name, date, fileSize, pointCount, type, s3Key }
export async function listCloudScans() {
  const client = getClient();

  const command = new ListObjectsV2Command({
    Bucket: AWS_BUCKET_NAME,
    Prefix: SCANS_PREFIX,
  });

  const response = await client.send(command);
  const contents = response.Contents || [];

  // Filter to only .ply files
  const plyFiles = contents.filter((obj) => obj.Key.endsWith('.ply'));

  return plyFiles.map((obj) => {
    // Extract a display name from the key: "scans/office-suite-200.ply" → "office suite 200"
    const filename = obj.Key.split('/').pop();
    const displayName = filename.replace('.ply', '').replace(/[-_]/g, ' ');

    return {
      id: `s3-${obj.Key}`,
      name: displayName,
      date: obj.LastModified ? obj.LastModified.toISOString().split('T')[0] : '—',
      fileSize: formatBytes(obj.Size),
      pointCount: '—', // Not known until file is loaded
      type: 'cloud',
      s3Key: obj.Key,
    };
  });
}

// ─── Download PLY ────────────────────────────────────────────
// Downloads a PLY file from S3 and returns it as a Blob.
export async function downloadPlyFromS3(s3Key) {
  if (DEV_MODE) {
    // Return an empty blob in dev mode — no real file to download
    return new Blob([], { type: 'application/octet-stream' });
  }

  const client = getClient();

  const command = new GetObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: s3Key,
  });

  const response = await client.send(command);

  // Convert the readable stream to a blob
  const chunks = [];
  const reader = response.Body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return new Blob(chunks, { type: 'application/octet-stream' });
}

// ─── Helpers ─────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
