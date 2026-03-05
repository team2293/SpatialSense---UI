import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { METERS_TO_FEET } from '../../constants';
import { snapToPoint } from '../../utils/pointSnapping';

function MeasurementPreview({ active, measurementStart, viewMode, axisConstraint, unit = 'meters', pointCloudRef, pointSize }) {
  const { camera, gl, size } = useThree();
  const [previewPos, setPreviewPos] = useState(null);
  const [isSnapped, setIsSnapped] = useState(false);
  const previewMeshRef = useRef();
  const ringRef = useRef();
  const lastRaycastTime = useRef(0);

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
    if (ringRef.current) {
      ringRef.current.scale.setScalar(scale);
    }
  });

  useEffect(() => {
    if (!active) {
      setPreviewPos(null);
      setIsSnapped(false);
      return;
    }

    const RAYCAST_INTERVAL = 50; // ms — throttle for performance with 1M+ points

    const handleMouseMove = (event) => {
      const now = performance.now();
      if (now - lastRaycastTime.current < RAYCAST_INTERVAL) return;
      lastRaycastTime.current = now;

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
        setPreviewPos(result.position);
        setIsSnapped(result.snapped);
      }
    };

    const canvas = gl.domElement;
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [active, camera, gl, viewMode, measurementStart, axisConstraint, pointCloudRef, pointSize]);

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

  const dotColor = isSnapped ? '#22d3ee' : '#facc15';
  const dotOpacity = isSnapped ? 0.9 : 0.5;

  return (
    <group>
      {/* Preview point */}
      <mesh ref={previewMeshRef} position={previewPos}>
        <sphereGeometry args={[PREVIEW_BASE_RADIUS, 16, 16]} />
        <meshBasicMaterial color={dotColor} transparent opacity={dotOpacity} />
      </mesh>
      {/* Snap indicator ring */}
      {isSnapped && (
        <mesh ref={ringRef} position={previewPos} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PREVIEW_BASE_RADIUS * 1.8, PREVIEW_BASE_RADIUS * 2.5, 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Crosshair on ground */}
      <group position={[previewPos[0], 0.001, previewPos[2]]}>
        <Line points={[[-0.1, 0, 0], [0.1, 0, 0]]} color={dotColor} lineWidth={1} transparent opacity={0.5} />
        <Line points={[[0, 0, -0.1], [0, 0, 0.1]]} color={dotColor} lineWidth={1} transparent opacity={0.5} />
      </group>
      {/* Vertical line to show height */}
      {previewPos[1] !== 0 && (
        <Line
          points={[[previewPos[0], 0, previewPos[2]], previewPos]}
          color={dotColor}
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
            color={dotColor}
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
