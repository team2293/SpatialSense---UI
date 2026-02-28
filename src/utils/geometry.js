import * as THREE from 'three';

export function getRaycastPlane(viewMode, referencePoint = null) {
  switch (viewMode) {
    case 'top':
      return new THREE.Plane(new THREE.Vector3(0, 1, 0), referencePoint ? -referencePoint[1] : 0);
    case 'front':
      return new THREE.Plane(new THREE.Vector3(0, 0, 1), referencePoint ? -referencePoint[2] : 0);
    case 'side':
      return new THREE.Plane(new THREE.Vector3(1, 0, 0), referencePoint ? -referencePoint[0] : 0);
    case 'perspective':
    default:
      return new THREE.Plane(new THREE.Vector3(0, 1, 0), referencePoint ? -referencePoint[1] : 0);
  }
}

export function applyAxisConstraint(point, referencePoint, axisConstraint) {
  if (!axisConstraint || !referencePoint) return point;

  const result = [...point];
  if (axisConstraint === 'x') {
    result[1] = referencePoint[1];
    result[2] = referencePoint[2];
  } else if (axisConstraint === 'y') {
    result[0] = referencePoint[0];
    result[2] = referencePoint[2];
  } else if (axisConstraint === 'z') {
    result[0] = referencePoint[0];
    result[1] = referencePoint[1];
  }
  return result;
}

export function rotatePointCloud(points, axis, degrees) {
  const angleRad = degrees * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const rotated = points.map(p => {
    const { x, y, z, color } = p;
    let nx, ny, nz;
    if (axis === 'x') {
      nx = x; ny = y * cos - z * sin; nz = y * sin + z * cos;
    } else if (axis === 'y') {
      nx = x * cos + z * sin; ny = y; nz = -x * sin + z * cos;
    } else {
      nx = x * cos - y * sin; ny = x * sin + y * cos; nz = z;
    }
    return { x: nx, y: ny, z: nz, color };
  });

  if (rotated.length === 0) return { points: rotated, dimensions: null };

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of rotated) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const recentered = rotated.map(p => ({
    x: p.x - centerX,
    y: p.y - minY,
    z: p.z - centerZ,
    color: p.color
  }));

  const dimensions = {
    length: maxX - minX,
    width: maxZ - minZ,
    height: maxY - minY
  };

  return { points: recentered, dimensions };
}
