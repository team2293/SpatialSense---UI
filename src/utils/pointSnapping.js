import * as THREE from 'three';
import { applyAxisConstraint } from './geometry';

const _raycaster = new THREE.Raycaster();
const _vertex = new THREE.Vector3();

/**
 * Snap the cursor to a real point cloud vertex via tight raycast.
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
 * Returns { position: [x,y,z] | null, snapped: boolean }.
 */
export function snapToPoint({
  mouse,
  camera,
  pointsMesh,
  measurementStart,
  axisConstraint,
  pointSize = 0.05,
}) {
  if (!pointsMesh) {
    return { position: null, snapped: false };
  }
  const positions = pointsMesh.geometry?.attributes?.position;
  if (!positions || positions.count === 0) {
    return { position: null, snapped: false };
  }

  _raycaster.setFromCamera(mouse, camera);
  _raycaster.params.Points.threshold = Math.max(0.1, pointSize * 3);
  const intersects = _raycaster.intersectObject(pointsMesh);

  if (intersects.length === 0) {
    return { position: null, snapped: false };
  }

  const pickedIndex = intersects[0].index ?? -1;
  if (pickedIndex < 0) {
    return { position: null, snapped: false };
  }

  _vertex.fromBufferAttribute(positions, pickedIndex);
  _vertex.applyMatrix4(pointsMesh.matrixWorld);
  let pos = [_vertex.x, _vertex.y, _vertex.z];

  if (measurementStart && axisConstraint) {
    pos = applyAxisConstraint(pos, measurementStart, axisConstraint);
  }

  return { position: pos, snapped: true };
}
