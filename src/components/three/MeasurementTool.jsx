import React, { useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { snapToPoint } from '../../utils/pointSnapping';

function MeasurementTool({ active, onMeasure, measurementStart, viewMode, axisConstraint, pointCloudRef, pointSize }) {
  const { camera, gl, size } = useThree();
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

    const result = snapToPoint({
      mouse,
      camera,
      pointsMesh: pointCloudRef?.current ?? null,
      viewMode,
      measurementStart,
      axisConstraint,
      pointSize,
    });

    if (result.position) {
      onMeasure(result.position);
    }
  }, [active, camera, gl, onMeasure, viewMode, measurementStart, axisConstraint, pointCloudRef, pointSize]);

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
