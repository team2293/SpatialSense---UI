// Project save/load — bundles the loaded point cloud, measurements, and
// scene metadata into a single .ssproj.json file the user downloads, and
// rehydrates it on load. Embedded point cloud means projects are portable
// and don't depend on S3 being reachable.

const PROJECT_VERSION = 1;
const FILE_EXTENSION = 'ssproj.json';

export function buildProjectPayload({
  name,
  pointCloud,
  originalPointCloud,
  modelRotation,
  roomDimensions,
  cameraHint,
  measurements,
}) {
  return {
    version: PROJECT_VERSION,
    name: name || 'Untitled Project',
    savedAt: new Date().toISOString(),
    pointCloud,
    originalPointCloud: originalPointCloud?.length ? originalPointCloud : undefined,
    modelRotation,
    roomDimensions,
    cameraHint: cameraHint || null,
    measurements,
  };
}

export function downloadProjectFile(payload) {
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const safeName = (payload.name || 'project').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.${FILE_EXTENSION}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseProjectFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data || typeof data !== 'object') {
          throw new Error('Project file is not valid JSON object');
        }
        if (data.version !== PROJECT_VERSION) {
          throw new Error(`Unsupported project version ${data.version} (expected ${PROJECT_VERSION})`);
        }
        if (!Array.isArray(data.pointCloud)) {
          throw new Error('Project file is missing pointCloud array');
        }
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read project file'));
    reader.readAsText(file);
  });
}

export const PROJECT_FILE_EXTENSION = FILE_EXTENSION;
