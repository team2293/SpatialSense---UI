import React from 'react';

const METERS_TO_FEET = 3.28084;

export default function PropertiesPanel({
  roomDimensions,
  formatLength,
  formatArea,
  formatVolume,
  unit,
  modelRotation,
  handleRotateModel,
  handleResetRotation,
  measurements,
  selectedMeasurement,
  setSelectedMeasurement,
  renamingMeasurement,
  renameValue,
  setRenameValue,
  renameInputRef,
  handleNameClick,
  handleRenameKeyDown,
  saveRename,
  deleteSelectedMeasurement,
  setActiveTool,
  setMeasurements,
  clearMeasurements,
  pointCloud,
  pointSize,
  setPointSize,
  shadingMode,
  setShadingMode,
}) {
  const floorArea = roomDimensions.length * roomDimensions.width;
  const volume = roomDimensions.length * roomDimensions.width * roomDimensions.height;

  return (
        <div className="w-72 bg-zinc-800 border-l border-zinc-700 flex flex-col">
          {/* Room Info */}
          <div className="p-4 border-b border-zinc-700">
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Room Properties</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Length (X)</span>
                <span className="text-white font-mono">{formatLength(roomDimensions.length)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Width (Z)</span>
                <span className="text-white font-mono">{formatLength(roomDimensions.width)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Height (Y)</span>
                <span className="text-white font-mono">{formatLength(roomDimensions.height)}</span>
              </div>
              <div className="border-t border-zinc-700 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Floor Area</span>
                  <span className="text-cyan-400 font-mono">{formatArea(floorArea)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-zinc-500">Volume</span>
                  <span className="text-cyan-400 font-mono">{formatVolume(volume)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Orientation - only shown when point cloud is loaded */}
          {pointCloud.length > 0 && (
            <div className="p-4 border-b border-zinc-700">
              <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Model Orientation</h3>
              <div className="space-y-2">
                {/* X axis rotation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold text-xs w-3">X</span>
                    <span className="text-zinc-500 text-xs font-mono w-10">{modelRotation.x}°</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleRotateModel('x', -90)}
                      className="px-2 py-1 bg-zinc-700 hover:bg-red-600/40 text-zinc-300 hover:text-white rounded text-xs transition"
                      title="Rotate -90° around X"
                    >
                      -90°
                    </button>
                    <button
                      onClick={() => handleRotateModel('x', 90)}
                      className="px-2 py-1 bg-zinc-700 hover:bg-red-600/40 text-zinc-300 hover:text-white rounded text-xs transition"
                      title="Rotate +90° around X"
                    >
                      +90°
                    </button>
                  </div>
                </div>
                {/* Y axis rotation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-bold text-xs w-3">Y</span>
                    <span className="text-zinc-500 text-xs font-mono w-10">{modelRotation.y}°</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleRotateModel('y', -90)}
                      className="px-2 py-1 bg-zinc-700 hover:bg-green-600/40 text-zinc-300 hover:text-white rounded text-xs transition"
                      title="Rotate -90° around Y"
                    >
                      -90°
                    </button>
                    <button
                      onClick={() => handleRotateModel('y', 90)}
                      className="px-2 py-1 bg-zinc-700 hover:bg-green-600/40 text-zinc-300 hover:text-white rounded text-xs transition"
                      title="Rotate +90° around Y"
                    >
                      +90°
                    </button>
                  </div>
                </div>
                {/* Z axis rotation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-bold text-xs w-3">Z</span>
                    <span className="text-zinc-500 text-xs font-mono w-10">{modelRotation.z}°</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleRotateModel('z', -90)}
                      className="px-2 py-1 bg-zinc-700 hover:bg-blue-600/40 text-zinc-300 hover:text-white rounded text-xs transition"
                      title="Rotate -90° around Z"
                    >
                      -90°
                    </button>
                    <button
                      onClick={() => handleRotateModel('z', 90)}
                      className="px-2 py-1 bg-zinc-700 hover:bg-blue-600/40 text-zinc-300 hover:text-white rounded text-xs transition"
                      title="Rotate +90° around Z"
                    >
                      +90°
                    </button>
                  </div>
                </div>
                {/* Reset button */}
                <button
                  onClick={handleResetRotation}
                  disabled={modelRotation.x === 0 && modelRotation.y === 0 && modelRotation.z === 0}
                  className="w-full mt-1 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-xs transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Reset Orientation
                </button>
              </div>
            </div>
          )}

          {/* Measurements List */}
          <div className="p-4 border-b border-zinc-700 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Measurements</h3>
              <div className="flex gap-2">
                {measurements.length > 0 && (
                  <button
                    onClick={clearMeasurements}
                    className="text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setActiveTool('measure')}
                  className="text-orange-400 hover:text-orange-300 text-xs font-medium"
                >
                  + New
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {measurements.length === 0 ? (
                <p className="text-zinc-600 text-xs">No measurements yet. Select the measure tool and click two points.</p>
              ) : (
                measurements.map((m) => {
                  // Calculate distance dynamically for unit conversion
                  const distMeters = Math.sqrt(
                    Math.pow(m.end[0] - m.start[0], 2) +
                    Math.pow(m.end[1] - m.start[1], 2) +
                    Math.pow(m.end[2] - m.start[2], 2)
                  );
                  return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMeasurement(selectedMeasurement === m.id ? null : m.id)}
                    className={`rounded p-3 cursor-pointer transition border group ${
                      selectedMeasurement === m.id
                        ? 'bg-yellow-500/20 border-yellow-500/50 ring-1 ring-yellow-500/30'
                        : 'bg-zinc-900 border-transparent hover:bg-zinc-700/50 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {renamingMeasurement === m.id ? (
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={saveRename}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs text-yellow-400 bg-zinc-800 border border-yellow-500/50 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-yellow-500/50 w-20"
                            autoFocus
                          />
                        ) : (
                          <span
                            onClick={(e) => handleNameClick(e, m.id, m.name)}
                            className={`font-mono text-xs cursor-text hover:underline ${selectedMeasurement === m.id ? 'text-yellow-400' : 'text-orange-400'}`}
                            title="Click to rename"
                          >
                            {m.name}
                          </span>
                        )}
                        {selectedMeasurement === m.id && renamingMeasurement !== m.id && (
                          <span className="text-yellow-500 text-xs">(selected)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono font-medium">{formatLength(distMeters)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMeasurements(prev => prev.filter(item => item.id !== m.id));
                            if (selectedMeasurement === m.id) setSelectedMeasurement(null);
                          }}
                          className={`w-5 h-5 rounded flex items-center justify-center transition ${
                            selectedMeasurement === m.id
                              ? 'text-red-400 hover:bg-red-500/30'
                              : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-zinc-600'
                          }`}
                          title="Delete measurement"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs">{m.points}</span>
                      {selectedMeasurement === m.id && (
                        <span className="text-zinc-500 text-xs">Drag points to adjust</span>
                      )}
                    </div>
                  </div>
                )})
              )}
            </div>
            {/* Keyboard shortcuts hint */}
            {selectedMeasurement && !renamingMeasurement && (
              <div className="mt-3 text-zinc-600 text-xs space-y-1">
                <p><span className="text-zinc-500">Click name</span> - Rename</p>
                <p><span className="text-zinc-500">X/Y/Z</span> - Lock axis</p>
                <p><span className="text-zinc-500">L</span> - Lock view</p>
                <p><span className="text-zinc-500">Delete</span> - Remove</p>
                <p><span className="text-zinc-500">Esc</span> - Deselect</p>
              </div>
            )}
          </div>

          {/* Point Cloud Display */}
          {pointCloud.length > 0 && (
            <div className="p-4 border-b border-zinc-700">
              <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Point Cloud Display</h3>
              <div className="space-y-3">
                {/* Point Size Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-zinc-500 text-xs">Point Size</span>
                    <span className="text-white font-mono text-xs">{pointSize.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.005"
                    max="0.2"
                    step="0.005"
                    value={pointSize}
                    onChange={(e) => setPointSize(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-zinc-600 text-[10px] mt-0.5">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>

                {/* Shading Mode */}
                <div>
                  <span className="text-zinc-500 text-xs block mb-1.5">Shading</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'original', label: 'Original' },
                      { id: 'height', label: 'Height Map' },
                      { id: 'intensity', label: 'Intensity' },
                      { id: 'normal', label: 'Normals' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setShadingMode(mode.id)}
                        className={`py-1.5 px-2 rounded text-xs font-medium transition ${
                          shadingMode === mode.id
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                            : 'bg-zinc-700 text-zinc-400 border border-transparent hover:bg-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
  );
}
