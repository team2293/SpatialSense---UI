import React, { useMemo } from 'react';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function PointCloud({ points, color = '#00ffff' }) {
  const ref = React.useRef();

  const positions = useMemo(() => {
    if (!points || points.length === 0) return new Float32Array(0);
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    return arr;
  }, [points]);

  const colors = useMemo(() => {
    if (!points || points.length === 0) return new Float32Array(0);
    const arr = new Float32Array(points.length * 3);
    const baseColor = new THREE.Color(color);
    points.forEach((p, i) => {
      // Use point color if available, otherwise use base color
      const c = p.color ? new THREE.Color(p.color) : baseColor;
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [points, color]);

  if (positions.length === 0) return null;

  return (
    <Points ref={ref} positions={positions} colors={colors}>
      <PointMaterial
        vertexColors
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </Points>
  );
}

export default PointCloud;
