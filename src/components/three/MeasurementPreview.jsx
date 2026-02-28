import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { getRaycastPlane, applyAxisConstraint } from '../../utils/geometry';
import { METERS_TO_FEET } from '../../constants';

function MeasurementPreview({ active, measurementStart, viewMode, axisConstraint, unit = 'meters' }) {
  const { camera, raycaster, gl, size } = useThree();
  const [previewPos, setPreviewPos] = useState(null);
  const previewMeshRef = useRef();

  // Dynamic scaling for preview dot
  const PREVIEW_BASE_RADIUS = 0.03;
  const PREVIEW_MAX_SCREEN_PX = 10;
  useFrame(() => {
    if (!previewMeshRef.current || !previewPos) return;
    const pointPos = new THREE.Vector3(...previewPos);
    let worldPerPixel;
    if (camera.isPerspectiveCamera) {
      const distance = camera.position.distanceTo(pointPos);
      worldPerPixel = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * distance / size.height;
    } else {
      worldPerPixel = 1 / camera.zoom;
    }
    const desiredWorldRadius = PREVIEW_MAX_SCREEN_PX * worldPerPixel;
    const scale = Math.min(desiredWorldRadius, PREVIEW_BASE_RADIUS) / PREVIEW_BASE_RADIUS;
    previewMeshRef.current.scale.setScalar(scale);
  });

  useEffect(() => {
    if (!active) {
      setPreviewPos(null);
      return;
    }

    const handleMouseMove = (event) => {
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

        setPreviewPos(finalPos);
      }
    };

    const canvas = gl.domElement;
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [active, camera, raycaster, gl, viewMode, measurementStart, axisConstraint]);

  if (!active || !previewPos) return null;

  // Calculate preview distance
  const previewDistanceMeters = measurementStart ? Math.sqrt(
    Math.pow(previewPos[0] - measurementStart[0], 2) +
    Math.pow(previewPos[1] - measurementStart[1], 2) +
    Math.pow(previewPos[2] - measurementStart[2], 2)
  ) : 0;
  const previewDistanceDisplay = unit === 'feet'
    ? `${(previewDistanceMeters * METERS_TO_FEET).toFixed(3)}ft`
    : `${previewDistanceMeters.toFixed(3)}m`;

  return (
    <group>
      {/* Preview point */}
      <mesh ref={previewMeshRef} position={previewPos}>
        <sphereGeometry args={[PREVIEW_BASE_RADIUS, 16, 16]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.5} />
      </mesh>
      {/* Crosshair on ground */}
      <group position={[previewPos[0], 0.001, previewPos[2]]}>
        <Line points={[[-0.1, 0, 0], [0.1, 0, 0]]} color="#facc15" lineWidth={1} transparent opacity={0.5} />
        <Line points={[[0, 0, -0.1], [0, 0, 0.1]]} color="#facc15" lineWidth={1} transparent opacity={0.5} />
      </group>
      {/* Vertical line to show height */}
      {previewPos[1] !== 0 && (
        <Line
          points={[[previewPos[0], 0, previewPos[2]], previewPos]}
          color="#facc15"
          lineWidth={1}
          dashed
          dashSize={0.05}
          gapSize={0.03}
        />
      )}
      {/* Line from start point if exists */}
      {measurementStart && (
        <>
          <Line
            points={[measurementStart, previewPos]}
            color="#facc15"
            lineWidth={1}
            dashed
            dashSize={0.1}
            gapSize={0.05}
          />
          {/* Preview distance label */}
          <Html position={[
            (measurementStart[0] + previewPos[0]) / 2,
            (measurementStart[1] + previewPos[1]) / 2 + 0.15,
            (measurementStart[2] + previewPos[2]) / 2
          ]} center>
            <div className="bg-zinc-800/80 px-2 py-1 rounded text-yellow-400/70 text-xs font-mono whitespace-nowrap">
              {previewDistanceDisplay}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

export default MeasurementPreview;
