import React, { useMemo } from 'react';
import { Line, Html } from '@react-three/drei';
import { derivePolygons } from '../../utils/measurementGraph';

// Build a quick lookup so a derived polygon can find its saved (named) twin.
function buildSavedLookup(areaMeasurements) {
  const map = new Map();
  for (const a of areaMeasurements) {
    if (a._sig) map.set(a._sig, a);
  }
  return map;
}

function polygonSig(vertices) {
  return vertices.map(v => v.map(c => c.toFixed(3)).join(',')).sort().join('|');
}

function PolygonAreaLabels({
  measurements,
  areaMeasurements = [],
  formatArea,
  onPolygonClick,
  selectedId = null,
  visible = true,
}) {
  const polygons = useMemo(() => derivePolygons(measurements), [measurements]);
  const savedLookup = useMemo(() => buildSavedLookup(areaMeasurements), [areaMeasurements]);

  if (!visible || polygons.length === 0) return null;

  return (
    <group>
      {polygons.map((poly) => {
        const fillPoints = [...poly.vertices, poly.vertices[0]];
        const sig = polygonSig(poly.vertices);
        const saved = savedLookup.get(sig);
        const isSelected = saved && selectedId === saved.id;
        const areaStr = formatArea ? formatArea(poly.area) : `${poly.area.toFixed(2)}m²`;
        return (
          <group key={poly.id}>
            <Line
              points={fillPoints}
              color={isSelected ? '#facc15' : '#22d3ee'}
              lineWidth={isSelected ? 3 : 2}
              transparent
              opacity={isSelected ? 0.7 : 0.4}
            />
            <Html position={poly.centroid} center>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPolygonClick) onPolygonClick({ ...poly, _sig: sig });
                }}
                title={saved ? 'Click to rename' : 'Click to save this area to the measurements list'}
                className={`px-2 py-1 rounded text-xs font-mono whitespace-nowrap shadow-lg cursor-pointer transition border select-none ${
                  isSelected
                    ? 'bg-yellow-900/90 border-yellow-400/70 text-yellow-100 ring-1 ring-yellow-400/50'
                    : saved
                      ? 'bg-cyan-900/90 border-cyan-400/70 text-cyan-100 hover:bg-cyan-800/90'
                      : 'bg-cyan-900/80 border-cyan-400/60 text-cyan-100 hover:bg-cyan-800/90'
                }`}
              >
                {saved ? `${saved.name}: ${areaStr}` : areaStr}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default PolygonAreaLabels;
