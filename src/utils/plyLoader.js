import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

export function parsePlyMetadata(arrayBuffer) {
  const headerBytes = new Uint8Array(arrayBuffer, 0, Math.min(arrayBuffer.byteLength, 4096));
  const headerText = new TextDecoder('ascii').decode(headerBytes);

  const metadata = {};
  const lines = headerText.split('\n');

  // Parse reference points: "comment name: (x,y,z)"
  const refPointNames = ['middle', 'top_middle', 'bottom_middle', 'left_middle', 'right_middle'];
  const refPointPattern = /^comment\s+(\w+):\s*\(([^)]+)\)/;

  for (const line of lines) {
    if (!line.startsWith('comment ')) continue;
    const content = line.substring(8).trim();

    // Check for reference point format: "middle: (-0.010516,0.011974,1.547000)"
    const refMatch = line.match(refPointPattern);
    if (refMatch && refPointNames.includes(refMatch[1])) {
      const parts = refMatch[2].split(',').map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        if (!metadata.referencePoints) metadata.referencePoints = {};
        metadata.referencePoints[refMatch[1]] = { x: parts[0], y: parts[1], z: parts[2] };
      }
      continue;
    }

    // Legacy metadata format
    const parseVec3 = (str) => {
      const parts = str.split(' ').map(Number);
      return { x: parts[0], y: parts[1], z: parts[2] };
    };

    if (content.startsWith('up_vector ')) {
      metadata.upVector = parseVec3(content.substring(10));
    } else if (content.startsWith('forward_vector ')) {
      metadata.forwardVector = parseVec3(content.substring(15));
    } else if (content.startsWith('primary_wall_normal ')) {
      metadata.primaryWallNormal = parseVec3(content.substring(19));
    }
  }

  // Derive coordinate frame from reference points (matches partner's Python script)
  // origin = middle
  // X axis = east  = normalize(right_middle - middle)
  // Y axis = north = normalize(top_middle - middle)
  // Z axis = up    = east × north  (points back toward camera)
  const refs = metadata.referencePoints;
  if (refs && refs.middle && refs.top_middle && refs.right_middle) {
    console.log('PLY reference points found:', refs);
    metadata.hasReferenceFrame = true;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

// Ported from partner's Python script — uses 5 reference points to build coordinate frame
// origin = middle
// X = east  = normalize(right_middle - middle)
// Y = north = normalize(top_middle - middle)
// Z = up    = east × north  (re-orthogonalized)
// Then maps: east→X, north→Y(up), up→-Z in Three.js
export function applyReferencePointOrientation(positions, colors, refs) {
  const mid = [refs.middle.x, refs.middle.y, refs.middle.z];
  const right = [refs.right_middle.x, refs.right_middle.y, refs.right_middle.z];
  const top = [refs.top_middle.x, refs.top_middle.y, refs.top_middle.z];

  const normalize = (v) => {
    const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
    return len > 1e-12 ? v.map(x => x / len) : null;
  };
  const cross = (a, b) => [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ];

  // East = right_middle - middle (camera's X axis)
  let east = normalize([right[0]-mid[0], right[1]-mid[1], right[2]-mid[2]]);
  // North = top_middle - middle (camera's Y axis / up in image)
  let north = normalize([top[0]-mid[0], top[1]-mid[1], top[2]-mid[2]]);

  if (!east || !north) {
    console.warn('Reference points too close together, falling back to algorithmic orientation');
    return null;
  }

  // Up = east × north (points back toward camera)
  let up = normalize(cross(east, north));
  if (!up) return null;

  // Re-orthogonalize north
  north = normalize(cross(up, east));
  if (!north) return null;

  console.log('Reference frame: east=', east, 'north=', north, 'up=', up);

  // Build rotation matrix: R = [east | north | up] as columns
  // This transforms from aligned coords to original coords.
  // We want R^T (transpose) to transform from original to aligned coords.
  // In aligned coords: X=east(right), Y=north(up), Z=up(back toward camera)
  // Three.js convention: X=right, Y=up, Z=toward viewer — perfect match!
  // So R^T maps original point coords → Three.js scene coords.
  const R = [
    east[0], east[1], east[2],     // row 0: dot with east → X
    north[0], north[1], north[2],  // row 1: dot with north → Y (up)
    up[0], up[1], up[2],           // row 2: dot with up → Z (toward viewer)
  ];

  const points = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const ox = positions[i], oy = positions[i+1], oz = positions[i+2];
    const px = R[0]*ox + R[1]*oy + R[2]*oz;
    const py = R[3]*ox + R[4]*oy + R[5]*oz;
    const pz = R[6]*ox + R[7]*oy + R[8]*oz;

    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (py < minY) minY = py; if (py > maxY) maxY = py;
    if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;

    const point = { x: px, y: py, z: pz };
    if (colors) {
      point.color = '#' + new THREE.Color(colors[i], colors[i + 1], colors[i + 2]).getHexString();
    }
    points.push(point);
  }

  // Center the point cloud and put floor at Y=0
  const yValues = points.map(p => p.y).sort((a, b) => a - b);
  const xValues = points.map(p => p.x).sort((a, b) => a - b);
  const zValues = points.map(p => p.z).sort((a, b) => a - b);
  const pLow = Math.floor(yValues.length * 0.01);
  const pHigh = Math.floor(yValues.length * 0.99);
  const xLow = Math.floor(xValues.length * 0.01);
  const xHigh = Math.floor(xValues.length * 0.99);
  const zLow = Math.floor(zValues.length * 0.01);
  const zHigh = Math.floor(zValues.length * 0.99);

  const floorY = yValues[pLow];
  const ceilY = yValues[pHigh];
  const centerX = (xValues[xLow] + xValues[xHigh]) / 2;
  const centerZ = (zValues[zLow] + zValues[zHigh]) / 2;

  const recentered = points.map(p => ({
    x: p.x - centerX,
    y: p.y - floorY,
    z: p.z - centerZ,
    color: p.color,
  }));

  const dimensions = {
    length: xValues[xHigh] - xValues[xLow],
    width: zValues[zHigh] - zValues[zLow],
    height: ceilY - floorY,
  };

  // Camera hint: camera was at origin looking toward middle
  // Transform origin (0,0,0) and middle through the same rotation + recentering
  const camX = R[0]*0 + R[1]*0 + R[2]*0 - centerX;
  const camY = R[3]*0 + R[4]*0 + R[5]*0 - floorY;
  const camZ = R[6]*0 + R[7]*0 + R[8]*0 - centerZ;

  const midX = R[0]*mid[0] + R[1]*mid[1] + R[2]*mid[2] - centerX;
  const midY = R[3]*mid[0] + R[4]*mid[1] + R[5]*mid[2] - floorY;
  const midZ = R[6]*mid[0] + R[7]*mid[1] + R[8]*mid[2] - centerZ;

  const cameraHint = {
    position: [camX, camY, camZ],
    target: [midX, midY, midZ],
  };

  console.log(`Reference point orientation: Room ${dimensions.length.toFixed(2)}m × ${dimensions.width.toFixed(2)}m × ${dimensions.height.toFixed(2)}m`);
  console.log('Camera hint:', cameraHint);

  return { points: recentered, dimensions, cameraHint };
}

export function alignWallsToAxes(points) {
  if (points.length === 0) return { points, dimensions: null, angleDeg: 0 };

  let hMinY = Infinity, hMaxY = -Infinity;
  for (const p of points) {
    if (p.y < hMinY) hMinY = p.y;
    if (p.y > hMaxY) hMaxY = p.y;
  }
  const totalHeight = hMaxY - hMinY;
  const yLow = hMinY + totalHeight * 0.15;
  const yHigh = hMaxY - totalHeight * 0.15;

  let wallXZ = [];
  for (const p of points) {
    if (p.y >= yLow && p.y <= yHigh) {
      wallXZ.push({ x: p.x, z: p.z });
    }
  }
  if (wallXZ.length < 200) wallXZ = points.map(p => ({ x: p.x, z: p.z }));

  let sample = wallXZ;
  if (wallXZ.length > 15000) {
    sample = [];
    const step = Math.floor(wallXZ.length / 15000);
    for (let i = 0; i < wallXZ.length; i += step) {
      sample.push(wallXZ[i]);
    }
  }

  console.log(`Wall alignment: ${points.length} total → ${wallXZ.length} wall-height → ${sample.length} sampled`);

  let bestAngle = 0;
  let bestCount = 0;
  const coarseResults = [];

  for (let deg = 0; deg < 90; deg += 1) {
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const p of sample) {
      const rx = p.x * cos + p.z * sin;
      const rz = -p.x * sin + p.z * cos;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (rz < minZ) minZ = rz;
      if (rz > maxZ) maxZ = rz;
    }

    const threshold = Math.max(maxX - minX, maxZ - minZ) * 0.03;

    let count = 0;
    for (const p of sample) {
      const rx = p.x * cos + p.z * sin;
      const rz = -p.x * sin + p.z * cos;
      if (rx - minX < threshold || maxX - rx < threshold ||
          rz - minZ < threshold || maxZ - rz < threshold) {
        count++;
      }
    }

    coarseResults.push({ deg, count });
    if (count > bestCount) {
      bestCount = count;
      bestAngle = deg;
    }
  }

  coarseResults.sort((a, b) => b.count - a.count);
  console.log(`Wall alignment coarse top 5: ${coarseResults.slice(0, 5).map(
    r => `${r.deg}° (${r.count} edge pts, ${(r.count / sample.length * 100).toFixed(1)}%)`
  ).join(', ')}`);

  const coarseBest = bestAngle;
  for (let deg = coarseBest - 2; deg <= coarseBest + 2; deg += 0.1) {
    const normalized = ((deg % 90) + 90) % 90;
    const rad = normalized * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const p of sample) {
      const rx = p.x * cos + p.z * sin;
      const rz = -p.x * sin + p.z * cos;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (rz < minZ) minZ = rz;
      if (rz > maxZ) maxZ = rz;
    }

    const threshold = Math.max(maxX - minX, maxZ - minZ) * 0.03;
    let count = 0;
    for (const p of sample) {
      const rx = p.x * cos + p.z * sin;
      const rz = -p.x * sin + p.z * cos;
      if (rx - minX < threshold || maxX - rx < threshold ||
          rz - minZ < threshold || maxZ - rz < threshold) {
        count++;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      bestAngle = normalized;
    }
  }

  console.log(`Wall alignment: best angle = ${bestAngle.toFixed(1)}° (${bestCount} edge pts, ${(bestCount / sample.length * 100).toFixed(1)}%)`);

  const rad = bestAngle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const aligned = points.map(p => {
    const nx = p.x * cos + p.z * sin;
    const nz = -p.x * sin + p.z * cos;
    return { x: nx, y: p.y, z: nz, color: p.color };
  });

  const aYvals = aligned.map(p => p.y).sort((a, b) => a - b);
  const aXvals = aligned.map(p => p.x).sort((a, b) => a - b);
  const aZvals = aligned.map(p => p.z).sort((a, b) => a - b);
  const pL = Math.floor(aYvals.length * 0.01);
  const pH = Math.floor(aYvals.length * 0.99);
  const xL = Math.floor(aXvals.length * 0.01);
  const xH = Math.floor(aXvals.length * 0.99);
  const zL = Math.floor(aZvals.length * 0.01);
  const zH = Math.floor(aZvals.length * 0.99);

  const floorY = aYvals[pL];
  const centerX = (aXvals[xL] + aXvals[xH]) / 2;
  const centerZ = (aZvals[zL] + aZvals[zH]) / 2;

  const recentered = aligned.map(p => ({
    x: p.x - centerX,
    y: p.y - floorY,
    z: p.z - centerZ,
    color: p.color
  }));

  const dimensions = {
    length: aXvals[xH] - aXvals[xL],
    width: aZvals[zH] - aZvals[zL],
    height: aYvals[pH] - aYvals[pL],
  };

  console.log(`Wall alignment: rotated ${bestAngle.toFixed(1)}°. Room: ${dimensions.length.toFixed(2)}m × ${dimensions.width.toFixed(2)}m × ${dimensions.height.toFixed(2)}m`);

  return { points: recentered, dimensions, angleDeg: bestAngle };
}

// Shared PLY buffer processing — deduplicates loadPlyFromUrl and loadPlyFromFile
export function processPlyBuffer(arrayBuffer) {
  const metadata = parsePlyMetadata(arrayBuffer);
  const loader = new PLYLoader();
  const geometry = loader.parse(arrayBuffer);

  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color?.array;

  // Use reference points if available (from partner's PLY writer)
  if (metadata && metadata.hasReferenceFrame) {
    console.log('Using PLY reference points for orientation');
    const result = applyReferencePointOrientation(positions, colors, metadata.referencePoints);
    if (result) return result;
    // Falls through to algorithmic orientation if reference points fail
  }

  console.log('No PLY metadata found, using algorithmic orientation');
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;

  const extentX = bbox.max.x - bbox.min.x;
  const extentY = bbox.max.y - bbox.min.y;
  const extentZ = bbox.max.z - bbox.min.z;

  const extents = [
    { axis: 'x', extent: extentX, min: bbox.min.x, max: bbox.max.x, index: 0 },
    { axis: 'y', extent: extentY, min: bbox.min.y, max: bbox.max.y, index: 1 },
    { axis: 'z', extent: extentZ, min: bbox.min.z, max: bbox.max.z, index: 2 }
  ];
  extents.sort((a, b) => a.extent - b.extent);

  const heightAxis = extents[0];
  const widthAxis = extents[1];
  const lengthAxis = extents[2];

  console.log('PLY orientation detection:', {
    original: { x: extentX.toFixed(2), y: extentY.toFixed(2), z: extentZ.toFixed(2) },
    mapping: `${lengthAxis.axis}->X, ${heightAxis.axis}->Y, ${widthAxis.axis}->Z`
  });

  const centers = {
    x: (bbox.max.x + bbox.min.x) / 2,
    y: (bbox.max.y + bbox.min.y) / 2,
    z: (bbox.max.z + bbox.min.z) / 2
  };

  const points = [];
  for (let i = 0; i < positions.length; i += 3) {
    const point = {
      x: positions[i + lengthAxis.index] - centers[lengthAxis.axis],
      y: positions[i + heightAxis.index] - heightAxis.min,
      z: positions[i + widthAxis.index] - centers[widthAxis.axis],
    };
    if (colors) {
      point.color = '#' + new THREE.Color(colors[i], colors[i + 1], colors[i + 2]).getHexString();
    }
    points.push(point);
  }

  const aligned = alignWallsToAxes(points);
  return { points: aligned.points, dimensions: aligned.dimensions, cameraHint: null };
}
