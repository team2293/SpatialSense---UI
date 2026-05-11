import * as THREE from 'three';
import { getRaycastPlane, applyAxisConstraint } from './geometry';

const _raycaster = new THREE.Raycaster();
const _vertex = new THREE.Vector3();

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
  disableSnap = false,
}) {
  _raycaster.setFromCamera(mouse, camera);

  // Try raycasting against point cloud first (unless user is holding the
  // free-move modifier — Cmd on Mac / Alt on Windows — in which case we
  // skip straight to the plane intersection for unconstrained placement).
  if (pointsMesh && !disableSnap) {
    _raycaster.params.Points.threshold = Math.max(0.1, pointSize * 3);
    const intersects = _raycaster.intersectObject(pointsMesh);

    if (intersects.length > 0) {
      const hit = intersects[0];

      // hit.point is the closest point on the ray to the vertex, not the
      // vertex itself — using it directly leaves a camera-direction offset
      // that becomes visible when the view rotates. Read the true vertex
      // position from the geometry buffer instead.
      const positions = pointsMesh.geometry?.attributes?.position;
      if (positions && hit.index != null) {
        _vertex.fromBufferAttribute(positions, hit.index);
        _vertex.applyMatrix4(pointsMesh.matrixWorld);
      } else {
        _vertex.copy(hit.point);
      }

      let pos = [_vertex.x, _vertex.y, _vertex.z];

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
