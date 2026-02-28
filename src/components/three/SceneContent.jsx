import React from 'react';
import { PerspectiveCamera, OrthographicCamera, OrbitControls, Grid } from '@react-three/drei';
import PointCloud from './PointCloud';
import RoomBox from './RoomBox';
import MeasurementLine from './MeasurementLine';
import MeasurementPreview from './MeasurementPreview';
import MeasurementTool from './MeasurementTool';
import CoordinateTracker from './CoordinateTracker';

function SceneContent({
  viewMode,
  showGrid,
  pointCloud,
  roomDimensions,
  measurements,
  activeTool,
  onMeasure,
  measurementStart,
  onPositionChange,
  onUpdateMeasurementPoint,
  axisConstraint,
  selectedMeasurement,
  onSelectMeasurement,
  isDraggingPoint,
  isViewLocked,
  onDragStart,
  onDragEnd,
  unit = 'meters',
  showAxes = true,
  showRoomBounds = true
}) {
  return (
    <>
      {/* Scene background (ensures screenshots have the dark bg, not white) */}
      <color attach="background" args={['#09090b']} />

      {/* Camera based on view mode */}
      {viewMode === 'perspective' ? (
        <PerspectiveCamera makeDefault position={[5, 4, 5]} fov={50} />
      ) : viewMode === 'inside' ? (
        <PerspectiveCamera makeDefault position={[0, roomDimensions.height / 2, 0]} fov={75} />
      ) : viewMode === 'top' ? (
        <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={50} />
      ) : viewMode === 'front' ? (
        <OrthographicCamera makeDefault position={[0, 2, 10]} zoom={50} />
      ) : (
        <OrthographicCamera makeDefault position={[10, 2, 0]} zoom={50} />
      )}

      <OrbitControls
        enablePan={!isDraggingPoint}
        enableZoom={!isDraggingPoint}
        enableRotate={(viewMode === 'perspective' || viewMode === 'inside') && !isDraggingPoint && !isViewLocked}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />

      {/* Grid */}
      {showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#333"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#444"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
      )}

      {/* Axis helper */}
      {showAxes && <axesHelper args={[1]} />}

      {/* Point Cloud */}
      <PointCloud points={pointCloud} />

      {/* Room Box wireframe */}
      <RoomBox dimensions={roomDimensions} visible={showRoomBounds} />

      {/* Measurements - with draggable points */}
      {measurements.map((m) => (
        <MeasurementLine
          key={m.id}
          id={m.id}
          start={m.start}
          end={m.end}
          label={m.distance}
          onUpdatePoint={onUpdateMeasurementPoint}
          axisConstraint={axisConstraint}
          isSelected={selectedMeasurement === m.id}
          onSelect={onSelectMeasurement}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          viewMode={viewMode}
          unit={unit}
        />
      ))}

      {/* Measurement Preview - shows where point will be placed */}
      <MeasurementPreview
        active={activeTool === 'measure'}
        measurementStart={measurementStart}
        viewMode={viewMode}
        axisConstraint={axisConstraint}
        unit={unit}
      />

      {/* Measurement Tool */}
      <MeasurementTool
        active={activeTool === 'measure'}
        onMeasure={onMeasure}
        measurementStart={measurementStart}
        viewMode={viewMode}
        axisConstraint={axisConstraint}
      />

      {/* Coordinate Tracker */}
      <CoordinateTracker onPositionChange={onPositionChange} />
    </>
  );
}

export default SceneContent;
