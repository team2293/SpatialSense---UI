import React, { useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRaycastPlane, applyAxisConstraint } from '../../utils/geometry';

function MeasurementTool({ active, onMeasure, measurementStart, viewMode, axisConstraint }) {
  const { camera, raycaster, gl, size } = useThree();
  const startPointRef = useRef();

  // Dynamic scaling for start point dot
  const START_BASE_RADIUS = 0.05;
  const START_MAX_SCREEN_PX = 14;
  useFrame(() => {
    if (!startPointRef.current || !measurementStart) return;
    const pointPos = new THREE.Vector3(...measurementStart);
    let worldPerPixel;
    if (camera.isPerspectiveCamera) {
      const distance = camera.position.distanceTo(pointPos);
      worldPerPixel = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * distance / size.height;
    } else {
      worldPerPixel = 1 / camera.zoom;
    }
    const desiredWorldRadius = START_MAX_SCREEN_PX * worldPerPixel;
    const scale = Math.min(desiredWorldRadius, START_BASE_RADIUS) / START_BASE_RADIUS;
    startPointRef.current.scale.setScalar(scale);
  });

  const handleClick = useCallback((event) => {
    if (!active) return;

    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);

    // For vertical measurements (Y axis locked), use a vertical plane through the start point
    let plane;
    if (measurementStart && axisConstraint === 'y') {
      // Use a plane facing the camera for easier vertical selection
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      // Create a vertical plane (normal is horizontal, perpendicular to camera view)
      const planeNormal = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
      plane = new THREE.Plane(planeNormal, -planeNormal.dot(new THREE.Vector3(...measurementStart)));
    } else {
      plane = getRaycastPlane(viewMode, measurementStart);
    }

    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      let finalPos = [intersectPoint.x, intersectPoint.y, intersectPoint.z];

      // Apply axis constraint if there's a start point
      if (measurementStart && axisConstraint) {
        finalPos = applyAxisConstraint(finalPos, measurementStart, axisConstraint);
      }

      onMeasure(finalPos);
    }
  }, [active, camera, raycaster, gl, onMeasure, viewMode, measurementStart, axisConstraint]);

  useEffect(() => {
    const canvas = gl.domElement;
    if (active) {
      canvas.addEventListener('click', handleClick);
      canvas.style.cursor = 'crosshair';
      return () => {
        canvas.removeEventListener('click', handleClick);
        canvas.style.cursor = 'auto';
      };
    }
  }, [active, handleClick, gl]);

  // Show pending measurement start point
  if (measurementStart) {
    return (
      <mesh ref={startPointRef} position={measurementStart}>
        <sphereGeometry args={[START_BASE_RADIUS, 16, 16]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
    );
  }

  return null;
}

export default MeasurementTool;
