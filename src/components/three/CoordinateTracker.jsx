import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function CoordinateTracker({ onPositionChange }) {
  const { camera, raycaster } = useThree();

  useFrame(({ mouse }) => {
    raycaster.setFromCamera(mouse, camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersectPoint);

    if (intersectPoint) {
      onPositionChange({
        x: intersectPoint.x.toFixed(3),
        y: intersectPoint.y.toFixed(3),
        z: intersectPoint.z.toFixed(3)
      });
    }
  });

  return null;
}

export default CoordinateTracker;
