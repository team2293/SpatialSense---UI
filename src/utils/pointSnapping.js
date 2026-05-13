import * as THREE from 'three';
import { applyAxisConstraint } from './geometry';

const _raycaster = new THREE.Raycaster();
const _vertex = new THREE.Vector3();
const _projected = new THREE.Vector3();

// How close (in screen pixels) the cursor must be to an existing measurement
// endpoint for the new line to snap onto it. Tuned to feel like a magnet
// without hijacking clicks meant for nearby point-cloud vertices.
const ENDPOINT_SNAP_PX = 18;

/**
 * Snap the cursor to a measurement-friendly position.
 *
 * Priority order:
 *   1. Existing measurement endpoint within ENDPOINT_SNAP_PX of the cursor
 *      (so chained lines lock onto shared corners — needed for closed shapes).
 *   2. Raycast against the point cloud (original behavior).
 *
 * The raycaster threshold (scaled with pointSize) gives a small bit of
 * slack so the cursor can land on a vertex without being pixel-perfect,
 * and it lets the snap "jump" across small gaps in the cloud. If the
 * raycast misses entirely, returns null — callers must treat that as
 * "no valid placement" and reject the click. We deliberately do NOT
 * fall back to a brute-force nearest-vertex-to-ray search, because
 * "closest to the ray" can be a point anywhere along the ray's depth
 * (e.g. on the wall behind the headboard), which makes the snapped
 * point appear correct head-on but float in mid-air from other angles.
 *
 * Returns { position: [x,y,z] | null, snapped: boolean, snappedToEndpoint: boolean }.
 */
export function snapToPoint({
  mouse,
  camera,
  pointsMesh,
  measurementStart,
  axisConstraint,
  pointSize = 0.05,
  existingEndpoints = null,
  canvasSize = null,
}) {
  // Endpoint snap — projects each existing endpoint to screen space and
  // checks pixel distance from the cursor.
  if (existingEndpoints && existingEndpoints.length && canvasSize) {
    const mousePx = {
      x: (mouse.x * 0.5 + 0.5) * canvasSize.width,
      y: (-mouse.y * 0.5 + 0.5) * canvasSize.height,
    };
    let bestEp = null;
    let bestDistPx = ENDPOINT_SNAP_PX;
    for (const ep of existingEndpoints) {
      _projected.set(ep[0], ep[1], ep[2]).project(camera);
      // Behind camera — skip.
      if (_projected.z < -1 || _projected.z > 1) continue;
      const px = (_projected.x * 0.5 + 0.5) * canvasSize.width;
      const py = (-_projected.y * 0.5 + 0.5) * canvasSize.height;
      const d = Math.hypot(px - mousePx.x, py - mousePx.y);
      if (d < bestDistPx) {
        bestDistPx = d;
        bestEp = ep;
      }
    }
    if (bestEp) {
      let pos = [bestEp[0], bestEp[1], bestEp[2]];
      if (measurementStart && axisConstraint) {
        pos = applyAxisConstraint(pos, measurementStart, axisConstraint);
      }
      return { position: pos, snapped: true, snappedToEndpoint: true };
    }
  }

  if (!pointsMesh) {
    return { position: null, snapped: false, snappedToEndpoint: false };
  }
  const positions = pointsMesh.geometry?.attributes?.position;
  if (!positions || positions.count === 0) {
    return { position: null, snapped: false, snappedToEndpoint: false };
  }

  _raycaster.setFromCamera(mouse, camera);
  _raycaster.params.Points.threshold = Math.max(0.1, pointSize * 3);
  const intersects = _raycaster.intersectObject(pointsMesh);

  if (intersects.length === 0) {
    return { position: null, snapped: false, snappedToEndpoint: false };
  }

  const pickedIndex = intersects[0].index ?? -1;
  if (pickedIndex < 0) {
    return { position: null, snapped: false, snappedToEndpoint: false };
  }

  _vertex.fromBufferAttribute(positions, pickedIndex);
  _vertex.applyMatrix4(pointsMesh.matrixWorld);
  let pos = [_vertex.x, _vertex.y, _vertex.z];

  if (measurementStart && axisConstraint) {
    pos = applyAxisConstraint(pos, measurementStart, axisConstraint);
  }

  return { position: pos, snapped: true, snappedToEndpoint: false };
}
