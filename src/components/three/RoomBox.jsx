import React from 'react';
import * as THREE from 'three';

function RoomBox({ dimensions, visible = true }) {
  if (!visible || !dimensions) return null;

  const { length, width, height } = dimensions;

  return (
    <group position={[0, height / 2, 0]}>
      <mesh>
        <boxGeometry args={[length, height, width]} />
        <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.3} />
      </mesh>
      {/* Floor */}
      <mesh position={[0, -height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length, width]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default RoomBox;
