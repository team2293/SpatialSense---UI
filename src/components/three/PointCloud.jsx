import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

function PointCloud({ points, color = '#00ffff', pointSize = 0.05, shadingMode = 'original' }) {
  const geometryRef = useRef();

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

  // Compute Y bounds for height map shading
  const yBounds = useMemo(() => {
    if (!points || points.length === 0) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    points.forEach((p) => {
      if (p.y < min) min = p.y;
      if (p.y > max) max = p.y;
    });
    if (min === max) max = min + 1;
    return { min, max };
  }, [points]);

  const colors = useMemo(() => {
    if (!points || points.length === 0) return new Float32Array(0);
    const arr = new Float32Array(points.length * 3);
    const baseColor = new THREE.Color(color);
    const tmpColor = new THREE.Color();

    points.forEach((p, i) => {
      let r, g, b;

      switch (shadingMode) {
        case 'height': {
          const t = (p.y - yBounds.min) / (yBounds.max - yBounds.min);
          tmpColor.setHSL(0.67 - t * 0.67, 1.0, 0.5);
          r = tmpColor.r; g = tmpColor.g; b = tmpColor.b;
          break;
        }
        case 'intensity': {
          const dist = Math.sqrt(p.x * p.x + p.z * p.z);
          const maxDist = 5;
          const intensity = Math.max(0, 1 - dist / maxDist);
          r = intensity; g = intensity; b = intensity;
          break;
        }
        case 'normal': {
          const len = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
          r = Math.abs(p.x / len);
          g = Math.abs(p.y / len);
          b = Math.abs(p.z / len);
          break;
        }
        default: {
          const c = p.color ? new THREE.Color(p.color) : baseColor;
          r = c.r; g = c.g; b = c.b;
          break;
        }
      }

      arr[i * 3] = r;
      arr[i * 3 + 1] = g;
      arr[i * 3 + 2] = b;
    });
    return arr;
  }, [points, color, shadingMode, yBounds]);

  // Manually set buffer attributes for reliable updates
  useEffect(() => {
    if (!geometryRef.current || positions.length === 0) return;
    geometryRef.current.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometryRef.current.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometryRef.current.computeBoundingSphere();
  }, [positions, colors]);

  if (positions.length === 0) return null;

  return (
    <points>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        vertexColors
        size={pointSize}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
}

export default PointCloud;
