import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { getRaycastPlane } from '../../utils/geometry';

function DraggablePoint({ position, onDrag, onDragStart, onDragEnd, color = '#facc15', axisConstraint = null, isSelected = false, viewMode = 'perspective' }) {
  const meshRef = useRef();
  const ringRef = useRef();
  const { camera, raycaster, gl, size } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartPos = useRef(new THREE.Vector3());
  const dragStartMouse = useRef(new THREE.Vector2());

  // Dynamic scaling to keep dots a consistent screen size
  const BASE_RADIUS = 0.04;
  const MAX_SCREEN_PX = 12; // max radius in screen pixels
  useFrame(() => {
    if (!meshRef.current) return;
    const pointPos = new THREE.Vector3(...position);
    let worldPerPixel;
    if (camera.isPerspectiveCamera) {
      const distance = camera.position.distanceTo(pointPos);
      worldPerPixel = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * distance / size.height;
    } else {
      worldPerPixel = 1 / camera.zoom;
    }
    const desiredWorldRadius = MAX_SCREEN_PX * worldPerPixel;
    const scale = Math.min(desiredWorldRadius, BASE_RADIUS) / BASE_RADIUS;
    meshRef.current.scale.setScalar(scale);
    if (ringRef.current) ringRef.current.scale.setScalar(scale);
  });

  // Calculate constrained position based on axis lock
  const getConstrainedPosition = useCallback((newPos, startPos) => {
    if (!axisConstraint) return newPos;

    const result = startPos.clone();
    if (axisConstraint === 'x') result.x = newPos.x;
    if (axisConstraint === 'y') result.y = newPos.y;
    if (axisConstraint === 'z') result.z = newPos.z;
    return result;
  }, [axisConstraint]);

  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();
    setIsDragging(true);
    dragStartPos.current.set(...position);

    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    dragStartMouse.current.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    gl.domElement.style.cursor = 'grabbing';
    if (onDragStart) onDragStart();
  }, [position, gl, onDragStart]);

  const handlePointerMove = useCallback((event) => {
    if (!isDragging) return;

    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);

    // For Y-axis dragging, use a vertical plane facing the camera
    let plane;
    if (axisConstraint === 'y') {
      // Create a vertical plane facing the camera for vertical dragging
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      // Plane normal is horizontal, perpendicular to camera view
      const planeNormal = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
      plane = new THREE.Plane(planeNormal, -planeNormal.dot(dragStartPos.current));
    } else {
      // Use view-appropriate plane for other dragging
      plane = getRaycastPlane(viewMode, [dragStartPos.current.x, dragStartPos.current.y, dragStartPos.current.z]);
    }

    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      const constrainedPos = getConstrainedPosition(intersectPoint, dragStartPos.current);
      onDrag([constrainedPos.x, constrainedPos.y, constrainedPos.z]);
    }
  }, [isDragging, camera, raycaster, gl, onDrag, getConstrainedPosition, viewMode, axisConstraint]);

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      gl.domElement.style.cursor = isHovered ? 'grab' : 'auto';
      if (onDragEnd) onDragEnd();
    }
  }, [isDragging, gl, isHovered, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Axis constraint visual indicator
  const AxisIndicator = () => {
    if (!axisConstraint || !isDragging) return null;
    const length = 2;
    const colors = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' };
    const directions = {
      x: [length, 0, 0],
      y: [0, length, 0],
      z: [0, 0, length]
    };
    return (
      <Line
        points={[
          [-directions[axisConstraint][0], -directions[axisConstraint][1], -directions[axisConstraint][2]],
          directions[axisConstraint]
        ]}
        color={colors[axisConstraint]}
        lineWidth={2}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
    );
  };

  return (
    <group position={position}>
      <AxisIndicator />
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerEnter={() => {
          setIsHovered(true);
          if (!isDragging) gl.domElement.style.cursor = 'grab';
        }}
        onPointerLeave={() => {
          setIsHovered(false);
          if (!isDragging) gl.domElement.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[isHovered || isDragging ? 0.05 : BASE_RADIUS, 16, 16]} />
        <meshBasicMaterial
          color={isDragging ? '#ffffff' : isHovered ? '#fef08a' : color}
          transparent
          opacity={isDragging ? 1 : 0.9}
        />
      </mesh>
      {/* Selection ring */}
      {(isSelected || isHovered) && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.08, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export default DraggablePoint;
