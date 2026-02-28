import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

export function parsePlyMetadata(arrayBuffer) {
  const headerBytes = new Uint8Array(arrayBuffer, 0, Math.min(arrayBuffer.byteLength, 4096));
  const headerText = new TextDecoder('ascii').decode(headerBytes);

  if (!headerText.includes('=== ORIENTATION METADATA ===')) return null;

  const metadata = {};
  const lines = headerText.split('\n');

  for (const line of lines) {
    if (!line.startsWith('comment ')) continue;
    const content = line.substring(8).trim();

    const parseVec3 = (str) => {
      const parts = str.split(' ').map(Number);
      return { x: parts[0], y: parts[1], z: parts[2] };
    };

    if (content.startsWith('up_vector ')) {
      metadata.upVector = parseVec3(content.substring(10));
    } else if (content.startsWith('forward_vector ')) {
      metadata.forwardVector = parseVec3(content.substring(15));
    } else if (content.startsWith('floor_plane_height ')) {
      metadata.floorHeight = parseFloat(content.split(' ')[1]);
    } else if (content.startsWith('ceiling_plane_height ')) {
      metadata.ceilingHeight = parseFloat(content.split(' ')[1]);
    } else if (content.startsWith('coordinate_system ')) {
      metadata.coordinateSystem = content.substring(18);
    } else if (content.startsWith('units ')) {
      metadata.units = content.substring(6);
    } else if (content.startsWith('scene_type ')) {
      metadata.sceneType = content.substring(11);
    } else if (content.startsWith('primary_wall_normal ')) {
      metadata.primaryWallNormal = parseVec3(content.substring(19));
    } else if (content.startsWith('scene_bounds_min ')) {
      metadata.boundsMin = parseVec3(content.substring(17));
    } else if (content.startsWith('scene_bounds_max ')) {
      metadata.boundsMax = parseVec3(content.substring(17));
    }
  }

  console.log('PLY metadata found:', metadata);
  return Object.keys(metadata).length > 0 ? metadata : null;
}

export function applyMetadataOrientation(positions, colors, metadata) {
  const up = metadata.upVector || { x: 0, y: 1, z: 0 };
  const wallNormal = metadata.primaryWallNormal || null;
  const floorHeight = metadata.floorHeight ?? null;

  let upVec = [up.x, up.y, up.z];
  const upLen = Math.sqrt(upVec[0]**2 + upVec[1]**2 + upVec[2]**2);
  if (upLen > 1e-8) upVec = upVec.map(v => v / upLen);
  else upVec = [0, 1, 0];

  const targetUp = [0, 1, 0];

  const cross = [
    upVec[1] * targetUp[2] - upVec[2] * targetUp[1],
    upVec[2] * targetUp[0] - upVec[0] * targetUp[2],
    upVec[0] * targetUp[1] - upVec[1] * targetUp[0],
  ];
  const dot = upVec[0] * targetUp[0] + upVec[1] * targetUp[1] + upVec[2] * targetUp[2];
  const crossLen = Math.sqrt(cross[0]**2 + cross[1]**2 + cross[2]**2);

  let R1 = [1,0,0, 0,1,0, 0,0,1];
  if (crossLen > 1e-8) {
    const axis = cross.map(v => v / crossLen);
    const c = dot;
    const s = crossLen;
    const t = 1 - c;
    const [ax, ay, az] = axis;
    R1 = [
      t*ax*ax + c,    t*ax*ay - s*az, t*ax*az + s*ay,
      t*ax*ay + s*az, t*ay*ay + c,    t*ay*az - s*ax,
      t*ax*az - s*ay, t*ay*az + s*ax, t*az*az + c,
    ];
  } else if (dot < 0) {
    R1 = [-1,0,0, 0,-1,0, 0,0,1];
  }

  let R2 = [1,0,0, 0,1,0, 0,0,1];
  if (wallNormal) {
    let wn = [wallNormal.x, wallNormal.y, wallNormal.z];
    const wnLen = Math.sqrt(wn[0]**2 + wn[1]**2 + wn[2]**2);
    if (wnLen > 1e-8) {
      wn = wn.map(v => v / wnLen);
      const wnR = [
        R1[0]*wn[0] + R1[1]*wn[1] + R1[2]*wn[2],
        R1[3]*wn[0] + R1[4]*wn[1] + R1[5]*wn[2],
        R1[6]*wn[0] + R1[7]*wn[1] + R1[8]*wn[2],
      ];
      const projX = wnR[0];
      const projZ = wnR[2];
      const projLen = Math.sqrt(projX**2 + projZ**2);
      if (projLen > 1e-8) {
        const angle = Math.atan2(projX, projZ);
        const c2 = Math.cos(-angle);
        const s2 = Math.sin(-angle);
        R2 = [c2,0,s2, 0,1,0, -s2,0,c2];
      }
    }
  }

  const R = [
    R2[0]*R1[0]+R2[1]*R1[3]+R2[2]*R1[6], R2[0]*R1[1]+R2[1]*R1[4]+R2[2]*R1[7], R2[0]*R1[2]+R2[1]*R1[5]+R2[2]*R1[8],
    R2[3]*R1[0]+R2[4]*R1[3]+R2[5]*R1[6], R2[3]*R1[1]+R2[4]*R1[4]+R2[5]*R1[7], R2[3]*R1[2]+R2[4]*R1[5]+R2[5]*R1[8],
    R2[6]*R1[0]+R2[7]*R1[3]+R2[8]*R1[6], R2[6]*R1[1]+R2[7]*R1[4]+R2[8]*R1[7], R2[6]*R1[2]+R2[7]*R1[5]+R2[8]*R1[8],
  ];

  console.log('Metadata orientation: up_vector', upVec, '→ Y, wall_normal →', wallNormal ? 'Z' : '(none, will use wall alignment)');

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

  console.log(`Floor detection: minY=${minY.toFixed(3)}, 1st percentile=${floorY.toFixed(3)}, 99th percentile=${ceilY.toFixed(3)}`);

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

  console.log(`Metadata orientation: Room ${dimensions.length.toFixed(2)}m × ${dimensions.width.toFixed(2)}m × ${dimensions.height.toFixed(2)}m`);

  if (!wallNormal) {
    console.log('No wall_normal in metadata, running wall alignment on rotated points...');
    const aligned = alignWallsToAxes(recentered);
    return { points: aligned.points, dimensions: aligned.dimensions };
  }

  return { points: recentered, dimensions };
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

  if (metadata && metadata.upVector) {
    console.log('Using PLY metadata for orientation');
    return applyMetadataOrientation(positions, colors, metadata);
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
  return { points: aligned.points, dimensions: aligned.dimensions };
}
