import * as THREE from 'three';
import { getRaycastPlane, applyAxisConstraint } from './geometry';

const _raycaster = new THREE.Raycaster();

/**
 * Try to snap to a point cloud point; fall back to plane intersection.
 * Returns { position: [x,y,z] | null, snapped: boolean }
 */
export function snapToPoint({
  mouse,
  camera,
  pointsMesh,
  viewMode,
  measurementStart,
  axisConstraint,
  pointSize = 0.05,
}) {
  _raycaster.setFromCamera(mouse, camera);

  // Try raycasting against point cloud first
  if (pointsMesh) {
    _raycaster.params.Points.threshold = Math.max(0.1, pointSize * 3);
    const intersects = _raycaster.intersectObject(pointsMesh);

    if (intersects.length > 0) {
      const hit = intersects[0];
      let pos = [hit.point.x, hit.point.y, hit.point.z];

      if (measurementStart && axisConstraint) {
        pos = applyAxisConstraint(pos, measurementStart, axisConstraint);
      }

      return { position: pos, snapped: true };
    }
  }

  // Fall back to plane intersection
  let plane;
  if (measurementStart && axisConstraint === 'y') {
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const planeNormal = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
    plane = new THREE.Plane(planeNormal, -planeNormal.dot(new THREE.Vector3(...measurementStart)));
  } else {
    plane = getRaycastPlane(viewMode, measurementStart);
  }

  const intersectPoint = new THREE.Vector3();
  const hit = _raycaster.ray.intersectPlane(plane, intersectPoint);

  if (hit) {
    let pos = [intersectPoint.x, intersectPoint.y, intersectPoint.z];
    if (measurementStart && axisConstraint) {
      pos = applyAxisConstraint(pos, measurementStart, axisConstraint);
    }
    return { position: pos, snapped: false };
  }

  return { position: null, snapped: false };
}
