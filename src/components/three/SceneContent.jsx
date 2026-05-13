import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrthographicCamera, OrbitControls, Grid } from '@react-three/drei';
import PointCloud from './PointCloud';
import RoomBox from './RoomBox';
import MeasurementLine from './MeasurementLine';
import MeasurementPreview from './MeasurementPreview';
import MeasurementTool from './MeasurementTool';
import CoordinateTracker from './CoordinateTracker';
import PolygonAreaLabels from './PolygonAreaLabels';
import { uniqueEndpoints } from '../../utils/measurementGraph';

// Applies camera hint from PLY metadata reference points
function CameraHintApplier({ cameraHint, controlsRef }) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (!cameraHint || !camera) return;

    const { position, target } = cameraHint;
    // The raw hint places the camera at the scanner origin, which sits
    // right on the model and crops it tight. Push the camera back along
    // the (target → position) vector so the model fits in view.
    const ZOOM_OUT_FACTOR = 2.4;
    if (position && target) {
      const dx = position[0] - target[0];
      const dy = position[1] - target[1];
      const dz = position[2] - target[2];
      camera.position.set(
        target[0] + dx * ZOOM_OUT_FACTOR,
        target[1] + dy * ZOOM_OUT_FACTOR,
        target[2] + dz * ZOOM_OUT_FACTOR,
      );
    } else if (position) {
      camera.position.set(position[0], position[1], position[2]);
    }
    if (target && controlsRef.current) {
      controlsRef.current.target.set(target[0], target[1], target[2]);
      controlsRef.current.update();
    } else if (target) {
      camera.lookAt(target[0], target[1], target[2]);
    }
    camera.updateProjectionMatrix();
  }, [cameraHint, camera, controlsRef]);

  return null;
}

// Auto-fits orthographic camera zoom to the point cloud size
function OrthoCameraFitter({ viewMode, roomDimensions, controlsRef }) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!camera.isOrthographicCamera) return;
    if (!roomDimensions) return;

    const length = roomDimensions.length || 6;
    const width = roomDimensions.width || 5;
    const height = roomDimensions.height || 2.8;

    let viewW, viewH, center;
    if (viewMode === 'top') {
      viewW = length; viewH = width;
      center = [0, height / 2, 0];
    } else if (viewMode === 'front') {
      viewW = length; viewH = height;
      center = [0, height / 2, 0];
    } else if (viewMode === 'side') {
      viewW = width; viewH = height;
      center = [0, height / 2, 0];
    } else {
      return;
    }

    // Fit with 15% padding
    const padding = 1.15;
    const zoomX = size.width / (viewW * padding);
    const zoomY = size.height / (viewH * padding);
    camera.zoom = Math.min(zoomX, zoomY);
    camera.updateProjectionMatrix();

    // Target the center of the scene so the cloud is framed
    if (controlsRef.current) {
      controlsRef.current.target.set(center[0], center[1], center[2]);
      controlsRef.current.update();
    }
  }, [viewMode, roomDimensions, camera, size, controlsRef]);

  return null;
}

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
  showRoomBounds = true,
  pointSize = 0.05,
  shadingMode = 'original',
  cameraHint = null,
  formatArea = null,
  areaMeasurements = [],
  onPromotePolygon = null,
}) {
  const pointCloudRef = useRef();
  const controlsRef = useRef();

  // Endpoints from already-placed measurements — used both for snap targeting
  // (so a new line locks onto a shared corner) and to drive polygon detection.
  const existingEndpoints = useMemo(() => uniqueEndpoints(measurements), [measurements]);

  // Clamp a dragged endpoint to the room's bounding box. The point cloud lives
  // inside this box; letting endpoints float outside it produces measurements
  // that have no relationship to anything in the scan.
  const clampToRoom = useCallback((pos) => {
    if (!roomDimensions) return pos;
    const halfL = roomDimensions.length / 2;
    const halfW = roomDimensions.width / 2;
    const h = roomDimensions.height;
    return [
      Math.max(-halfL, Math.min(halfL, pos[0])),
      Math.max(0, Math.min(h, pos[1])),
      Math.max(-halfW, Math.min(halfW, pos[2])),
    ];
  }, [roomDimensions]);

  const handleUpdateMeasurementPoint = useCallback((id, pointType, newPos) => {
    if (onUpdateMeasurementPoint) {
      onUpdateMeasurementPoint(id, pointType, clampToRoom(newPos));
    }
  }, [onUpdateMeasurementPoint, clampToRoom]);

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
        ref={controlsRef}
        enablePan={!isDraggingPoint}
        enableZoom={!isDraggingPoint}
        enableRotate={(viewMode === 'perspective' || viewMode === 'inside') && !isDraggingPoint && !isViewLocked}
      />

      {/* Apply camera position from PLY reference points */}
      {cameraHint && viewMode === 'perspective' && (
        <CameraHintApplier cameraHint={cameraHint} controlsRef={controlsRef} />
      )}

      {/* Auto-fit orthographic cameras to point cloud */}
      {(viewMode === 'top' || viewMode === 'front' || viewMode === 'side') && (
        <OrthoCameraFitter viewMode={viewMode} roomDimensions={roomDimensions} controlsRef={controlsRef} />
      )}

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
      <PointCloud ref={pointCloudRef} points={pointCloud} pointSize={pointSize} shadingMode={shadingMode} />

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
          name={m.name}
          onUpdatePoint={handleUpdateMeasurementPoint}
          axisConstraint={axisConstraint}
          isSelected={selectedMeasurement === m.id}
          onSelect={onSelectMeasurement}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          viewMode={viewMode}
          unit={unit}
        />
      ))}

      {/* Closed-polygon area labels (triangles & quads formed by chained measurements) */}
      <PolygonAreaLabels
        measurements={measurements}
        areaMeasurements={areaMeasurements}
        formatArea={formatArea}
        onPolygonClick={onPromotePolygon}
        selectedId={selectedMeasurement}
      />

      {/* Measurement Preview - shows where point will be placed */}
      <MeasurementPreview
        active={activeTool === 'measure'}
        measurementStart={measurementStart}
        viewMode={viewMode}
        axisConstraint={axisConstraint}
        unit={unit}
        pointCloudRef={pointCloudRef}
        pointSize={pointSize}
        existingEndpoints={existingEndpoints}
      />

      {/* Measurement Tool */}
      <MeasurementTool
        active={activeTool === 'measure'}
        onMeasure={onMeasure}
        measurementStart={measurementStart}
        viewMode={viewMode}
        axisConstraint={axisConstraint}
        pointCloudRef={pointCloudRef}
        pointSize={pointSize}
        existingEndpoints={existingEndpoints}
      />

      {/* Coordinate Tracker */}
      <CoordinateTracker onPositionChange={onPositionChange} />
    </>
  );
}

export default SceneContent;
