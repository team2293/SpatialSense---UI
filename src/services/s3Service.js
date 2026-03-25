// ─── S3 Service ──────────────────────────────────────────────
// Handles listing and downloading PLY files from AWS S3.
// Once awsConfig.js is filled in, this is fully functional.

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  AWS_REGION,
  AWS_BUCKET_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  SCANS_PREFIX,
} from './awsConfig';
import { DEV_MODE } from './awsConfig';

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

// ─── Scan Commands via S3 ────────────────────────────────────
// Communicates with the Jetson by writing/reading files in S3.
// The Jetson polls for command files and writes status files.

const COMMANDS_PREFIX = 'commands/';

// Write a start-scan command file to S3.
// The Jetson polls for this file, picks it up, starts the scan, and deletes it.
export async function writeScanCommand(scanDetails) {
  const client = getClient();

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: `${COMMANDS_PREFIX}start-scan.json`,
    Body: JSON.stringify({
      ...scanDetails,
      timestamp: new Date().toISOString(),
    }),
    ContentType: 'application/json',
  });

  await client.send(command);
}

// Write a stop-scan command file to S3.
export async function writeStopCommand() {
  const client = getClient();

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: `${COMMANDS_PREFIX}stop-scan.json`,
    Body: JSON.stringify({ timestamp: new Date().toISOString() }),
    ContentType: 'application/json',
  });

  await client.send(command);
}

// Check if a scan-status.json file exists in S3 (written by the Jetson).
// Returns: { status: 'scanning' | 'complete' | 'error', s3Key?, message? }
export async function readScanStatus() {
  const client = getClient();

  try {
    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: `${COMMANDS_PREFIX}scan-status.json`,
    });

    const response = await client.send(command);
    const chunks = [];
    const reader = response.Body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const text = new TextDecoder().decode(new Blob(chunks).arrayBuffer ? await new Blob(chunks).arrayBuffer() : chunks[0]);
    return JSON.parse(text);
  } catch (err) {
    // If the file doesn't exist, no status update yet
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

// Poll S3 for new PLY files that appeared after a given timestamp.
export async function checkForNewPly(afterTimestamp) {
  const client = getClient();

  const command = new ListObjectsV2Command({
    Bucket: AWS_BUCKET_NAME,
    Prefix: SCANS_PREFIX,
  });

  const response = await client.send(command);
  const contents = response.Contents || [];

  // Find PLY files uploaded after the scan started
  const newFiles = contents
    .filter((obj) => obj.Key.endsWith('.ply') && obj.LastModified > afterTimestamp)
    .sort((a, b) => b.LastModified - a.LastModified);

  return newFiles.length > 0 ? newFiles[0].Key : null;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
