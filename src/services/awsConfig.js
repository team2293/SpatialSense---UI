// ─── AWS Configuration ───────────────────────────────────────
// Reads from Vite environment variables (import.meta.env.VITE_*).
//
// For local development, create a .env.local file in the project root with:
//   VITE_AWS_REGION=us-east-1
//   VITE_AWS_BUCKET_NAME=your-bucket-name
//   VITE_AWS_ACCESS_KEY_ID=your-access-key
//   VITE_AWS_SECRET_ACCESS_KEY=your-secret-key
//   VITE_SCANS_PREFIX=
//
// For Vercel deployment, set the same variables in:
//   Project Settings → Environment Variables
//
// ⚠️  .env.local is gitignored — never commit real credentials.

export const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
export const AWS_BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET_NAME || '';
export const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID || '';
export const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '';
export const SCANS_PREFIX = import.meta.env.VITE_SCANS_PREFIX || '';

// ─── Dev Mode Toggle ──────────────────────────────────────────
// Set to true to simulate scans without the Jetson connected.
export const DEV_MODE = false;
