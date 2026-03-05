import React from 'react';
import { Line, Html } from '@react-three/drei';
import DraggablePoint from './DraggablePoint';
import { METERS_TO_FEET } from '../../constants';

function MeasurementLine({
  id,
  start,
  end,
  label,
  name,
  color = '#facc15',
  onUpdatePoint,
  axisConstraint = null,
  isSelected = false,
  onSelect,
  onDragStart,
  onDragEnd,
  viewMode = 'perspective',
  unit = 'meters'
}) {
  if (!start || !end) return null;

  const midPoint = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + 0.15,
    (start[2] + end[2]) / 2
  ];

  // Calculate distance dynamically (in meters)
  const distanceMeters = Math.sqrt(
    Math.pow(end[0] - start[0], 2) +
    Math.pow(end[1] - start[1], 2) +
    Math.pow(end[2] - start[2], 2)
  );

  // Format based on unit
  const displayDistance = unit === 'feet'
    ? `${(distanceMeters * METERS_TO_FEET).toFixed(3)}ft`
    : `${distanceMeters.toFixed(3)}m`;

  return (
    <group onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(id); }}>
      <Line
        points={[start, end]}
        color={isSelected ? '#ffffff' : color}
        lineWidth={isSelected ? 3 : 2}
      />
      {/* Start point - draggable */}
      <DraggablePoint
        position={start}
        color={color}
        axisConstraint={axisConstraint}
        isSelected={isSelected}
        onDrag={(newPos) => onUpdatePoint && onUpdatePoint(id, 'start', newPos)}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        viewMode={viewMode}
      />
      {/* End point - draggable */}
      <DraggablePoint
        position={end}
        color={color}
        axisConstraint={axisConstraint}
        isSelected={isSelected}
        onDrag={(newPos) => onUpdatePoint && onUpdatePoint(id, 'end', newPos)}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        viewMode={viewMode}
      />
      {/* Label */}
      <Html position={midPoint} center>
        <div
          className={`px-2 py-1 rounded text-xs font-mono whitespace-nowrap cursor-pointer transition-all ${
            isSelected
              ? 'bg-yellow-500 text-zinc-900 border border-yellow-300'
              : 'bg-zinc-900/90 text-yellow-400 border border-yellow-400/30'
          }`}
        >
          {name && <span className="text-zinc-500 mr-1.5">{name}</span>}{displayDistance}
        </div>
      </Html>
    </group>
  );
}

export default MeasurementLine;
