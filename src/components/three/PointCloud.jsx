import { useMemo, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

const PointCloud = forwardRef(function PointCloud(
  { points, color = '#00ffff', pointSize = 0.05, shadingMode = 'original' },
  ref
) {
  const geometryRef = useRef();
  const pointsRef = useRef();

  // Expose the <points> mesh so measurement tools can raycast against it
  useImperativeHandle(ref, () => pointsRef.current);

  // Soft gaussian-falloff sprite so point edges blend instead of cutting hard.
  // This is what makes the cloud look denser/closer to MeshLab.
  const circleTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const positions = useMemo(() => {
    if (!points || points.length === 0) return new Float32Array(0);
    const arr = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    return arr;
  }, [points]);

  // Compute Y bounds for height map shading
  const yBounds = useMemo(() => {
    if (!points || points.length === 0) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const y = points[i].y;
      if (y < min) min = y;
      if (y > max) max = y;
    }
    if (min === max) max = min + 1;
    return { min, max };
  }, [points]);

  const colors = useMemo(() => {
    if (!points || points.length === 0) return new Float32Array(0);
    const arr = new Float32Array(points.length * 3);
    const baseColor = new THREE.Color(color);
    const baseR = baseColor.r, baseG = baseColor.g, baseB = baseColor.b;
    const tmpColor = new THREE.Color();
    const yRange = yBounds.max - yBounds.min;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let r, g, b;
      const idx = i * 3;

      switch (shadingMode) {
        case 'height': {
          const t = (p.y - yBounds.min) / yRange;
          tmpColor.setHSL(0.67 - t * 0.67, 1.0, 0.5);
          r = tmpColor.r; g = tmpColor.g; b = tmpColor.b;
          break;
        }
        case 'intensity': {
          const dist = Math.sqrt(p.x * p.x + p.z * p.z);
          const intensity = Math.max(0, 1 - dist / 5);
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
          r = p.r !== undefined ? p.r : baseR;
          g = p.g !== undefined ? p.g : baseG;
          b = p.b !== undefined ? p.b : baseB;
          break;
        }
      }

      arr[idx] = r;
      arr[idx + 1] = g;
      arr[idx + 2] = b;
    }
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
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        vertexColors
        size={pointSize * 2}
        sizeAttenuation
        transparent
        opacity={1.0}
        map={circleTexture}
        depthWrite={false}
      />
    </points>
  );
});

export default PointCloud;
