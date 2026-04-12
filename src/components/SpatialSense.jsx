import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';

// Constants
import { ScannerState } from '../constants';

// Utils
import { formatLength, formatArea, formatVolume } from '../utils/formatters';
import { downloadMeasurementsJSON, downloadMeasurementsCSV } from '../utils/export';

// Hooks
import { usePointCloudManager } from '../hooks/usePointCloudManager';
import { useMeasurements } from '../hooks/useMeasurements';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useNotification } from '../hooks/useNotification';

// Three.js scene
import SceneContent from './three/SceneContent';

// UI components
import MenuBar from './ui/MenuBar';
import Toolbar from './ui/Toolbar';
import ViewTabs from './ui/ViewTabs';
import ViewportOverlays from './ui/ViewportOverlays';
import PropertiesPanel from './ui/PropertiesPanel';
import StatusBar from './ui/StatusBar';
import NotificationPopup from './ui/NotificationPopup';
import ReportPreviewModal from './ui/ReportPreviewModal';

// =============================================================================
// TOOL & VIEW DEFINITIONS
// =============================================================================
const tools = [
  { id: 'select', icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122', label: 'Select' },
  { id: 'measure', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', label: 'Measure' },
  { id: 'annotate', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', label: 'Annotate' },
  { id: 'section', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z', label: 'Section' },
];

const views = [
  { id: 'perspective', label: '3D' },
  { id: 'top', label: 'Top' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'inside', label: 'Inside' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function SpatialSense({ initialScan = null, onBack = null }) {
  // --- UI State ---
  const [activeTool, setActiveTool] = useState('select');
  const [selectedView, setSelectedView] = useState('perspective');
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [unit, setUnit] = useState('meters');
  const [activeMenu, setActiveMenu] = useState(null);
  const [showRoomBounds, setShowRoomBounds] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [cursorPosition, setCursorPosition] = useState({ x: '0.000', y: '0.000', z: '0.000' });
  const [pointSize, setPointSize] = useState(0.05);
  const [shadingMode, setShadingMode] = useState('original');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportScreenshot, setReportScreenshot] = useState(null);

  const menuBarRef = useRef(null);
  const viewportRef = useRef(null);

  // --- Custom Hooks ---
  const pcm = usePointCloudManager();
  const meas = useMeasurements({ setActiveTool });
  const { notification, showNotification, playScreenshotSound } = useNotification();

  // --- Auto-load scan from dashboard selection ---
  useEffect(() => {
    if (!initialScan) return;
    if (initialScan.file) {
      pcm.loadPlyFromFile(initialScan.file);
    } else if (initialScan.url) {
      pcm.loadPlyFromUrl(initialScan.url);
    } else {
      pcm.loadDemoData();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyboardShortcuts({
    selectedMeasurement: meas.selectedMeasurement,
    measurementStart: meas.measurementStart,
    renamingMeasurement: meas.renamingMeasurement,
    setAxisConstraint: meas.setAxisConstraint,
    setIsViewLocked: meas.setIsViewLocked,
    deleteSelectedMeasurement: meas.deleteSelectedMeasurement,
    setMeasurementStart: meas.setMeasurementStart,
    setActiveTool,
    setSelectedMeasurement: meas.setSelectedMeasurement,
  });

  // --- Dropdown Menu: click-outside to close ---
  useEffect(() => {
    if (!activeMenu) return;
    const handleClickOutside = (e) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  const toggleMenu = useCallback((menuName) => {
    setActiveMenu(prev => prev === menuName ? null : menuName);
  }, []);

  // --- Export wrappers (close menu after export) ---
  const exportMeasurementsJSON = useCallback(() => {
    if (meas.measurements.length === 0) return;
    downloadMeasurementsJSON(meas.measurements);
    setActiveMenu(null);
  }, [meas.measurements]);

  const exportMeasurementsCSV = useCallback(() => {
    if (meas.measurements.length === 0) return;
    downloadMeasurementsCSV(meas.measurements);
    setActiveMenu(null);
  }, [meas.measurements]);

  // --- Screenshot viewport → copy to clipboard ---
  const screenshotViewport = useCallback(async () => {
    setActiveMenu(null);
    try {
      const canvas = viewportRef.current?.querySelector('canvas');
      if (!canvas) {
        showNotification('No viewport canvas found', 'error');
        return;
      }

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to capture canvas'));
        }, 'image/png');
      });

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      playScreenshotSound();
      showNotification('Screenshot copied to clipboard!');
    } catch (err) {
      console.error('Screenshot failed:', err);
      showNotification('Screenshot failed — check browser permissions', 'error');
    }
  }, [showNotification, playScreenshotSound]);

  // --- Open Report Preview (captures screenshot, then opens modal) ---
  const openReportPreview = useCallback(() => {
    setActiveMenu(null);
    try {
      const canvas = viewportRef.current?.querySelector('canvas');
      if (canvas) {
        setReportScreenshot(canvas.toDataURL('image/png'));
      } else {
        setReportScreenshot(null);
      }
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      setReportScreenshot(null);
    }
    setReportOpen(true);
  }, []);

  // --- New Project (reset all state) ---
  const handleNewProject = useCallback(() => {
    setActiveTool('select');
    setSelectedView('perspective');
    setShowGrid(true);
    setShowDimensions(true);
    setShowRoomBounds(true);
    setShowAxes(true);
    setActiveMenu(null);
    meas.clearMeasurements();
    pcm.setPointCloud([]);
    pcm.setScannerState(ScannerState.DISCONNECTED);
    pcm.setScannerMessage('No scanner connected');
  }, [meas, pcm]);

  // --- Scanner state color ---
  const getStateColor = useCallback(() => {
    switch (pcm.scannerState) {
      case ScannerState.DISCONNECTED: return 'text-zinc-500';
      case ScannerState.CONNECTING: return 'text-yellow-500';
      case ScannerState.CONNECTED: return 'text-blue-500';
      case ScannerState.SCANNING: return 'text-yellow-500 animate-pulse';
      case ScannerState.PROCESSING: return 'text-orange-500 animate-pulse';
      case ScannerState.MODEL_LOADED: return 'text-green-500';
      case ScannerState.ERROR: return 'text-red-500';
      default: return 'text-zinc-500';
    }
  }, [pcm.scannerState]);

  // --- Format helpers (bind unit) ---
  const fmtLength = useCallback((meters, decimals) => formatLength(meters, unit, decimals), [unit]);
  const fmtArea = useCallback((sqMeters, decimals) => formatArea(sqMeters, unit, decimals), [unit]);
  const fmtVolume = useCallback((cubicMeters, decimals) => formatVolume(cubicMeters, unit, decimals), [unit]);

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="w-full h-screen bg-zinc-900 flex flex-col font-sans text-sm">

      {/* Hidden file input for PLY loading */}
      <input
        type="file"
        ref={pcm.fileInputRef}
        onChange={pcm.handleFileSelect}
        accept=".ply"
        className="hidden"
      />

      {/* Top Menu Bar */}
      <MenuBar
        onBack={onBack}
        activeMenu={activeMenu}
        toggleMenu={toggleMenu}
        setActiveMenu={setActiveMenu}
        selectedView={selectedView}
        setSelectedView={setSelectedView}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showAxes={showAxes}
        setShowAxes={setShowAxes}
        showDimensions={showDimensions}
        setShowDimensions={setShowDimensions}
        showRoomBounds={showRoomBounds}
        setShowRoomBounds={setShowRoomBounds}
        isViewLocked={meas.isViewLocked}
        setIsViewLocked={meas.setIsViewLocked}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        axisConstraint={meas.axisConstraint}
        setAxisConstraint={meas.setAxisConstraint}
        measurements={meas.measurements}
        clearMeasurements={meas.clearMeasurements}
        exportMeasurementsJSON={exportMeasurementsJSON}
        exportMeasurementsCSV={exportMeasurementsCSV}
        openReportPreview={openReportPreview}
        screenshotViewport={screenshotViewport}
        scannerState={pcm.scannerState}
        connectToScanner={pcm.connectToScanner}
        startScan={pcm.startScan}
        disconnectScanner={pcm.disconnectScanner}
        loadDemoData={pcm.loadDemoData}
        loadPlyFromUrl={pcm.loadPlyFromUrl}
        connectionUrl={pcm.connectionUrl}
        setConnectionUrl={pcm.setConnectionUrl}
        fileInputRef={pcm.fileInputRef}
        handleFileSelect={pcm.handleFileSelect}
        menuBarRef={menuBarRef}
        unit={unit}
        setUnit={setUnit}
        selectedMeasurement={meas.selectedMeasurement}
        deleteSelectedMeasurement={meas.deleteSelectedMeasurement}
        startRename={meas.startRename}
        scannerMessage={pcm.scannerMessage}
        onNewProject={handleNewProject}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Toolbar */}
        <Toolbar
          tools={tools}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          showDimensions={showDimensions}
          setShowDimensions={setShowDimensions}
        />

        {/* Center: View Tabs + Viewport */}
        <div className="flex-1 flex flex-col">
          <ViewTabs
            views={views}
            selectedView={selectedView}
            setSelectedView={setSelectedView}
            unit={unit}
            setUnit={setUnit}
          />

          {/* 3D Viewport */}
          <div ref={viewportRef} className="flex-1 bg-zinc-950 relative overflow-hidden">
            <Canvas
              gl={{ antialias: true, preserveDrawingBuffer: true }}
              style={{ background: '#09090b' }}
            >
              <SceneContent
                viewMode={selectedView}
                showGrid={showGrid}
                pointCloud={pcm.pointCloud}
                pointSize={pointSize}
                shadingMode={shadingMode}
                roomDimensions={pcm.roomDimensions}
                measurements={meas.measurements}
                activeTool={activeTool}
                onMeasure={meas.handleMeasurePoint}
                measurementStart={meas.measurementStart}
                onPositionChange={setCursorPosition}
                onUpdateMeasurementPoint={meas.updateMeasurementPoint}
                axisConstraint={meas.axisConstraint}
                selectedMeasurement={meas.selectedMeasurement}
                onSelectMeasurement={meas.setSelectedMeasurement}
                isDraggingPoint={meas.isDraggingPoint}
                isViewLocked={meas.isViewLocked}
                onDragStart={() => meas.setIsDraggingPoint(true)}
                onDragEnd={() => meas.setIsDraggingPoint(false)}
                unit={unit}
                showAxes={showAxes}
                showRoomBounds={showRoomBounds}
                cameraHint={pcm.cameraHint}
              />
            </Canvas>

            {/* Loading overlay */}
            {pcm.scannerState === ScannerState.PROCESSING && (
              <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center z-30">
                <div className="flex flex-col items-center gap-4">
                  {/* Spinner */}
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" color="#f97316" />
                      <path className="opacity-90" fill="#f97316" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-sm font-medium">{pcm.scannerMessage}</p>
                    <p className="text-zinc-500 text-xs mt-1">Processing point cloud data</p>
                  </div>
                </div>
              </div>
            )}

            {/* Overlays on top of viewport */}
            <ViewportOverlays
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              measurementStart={meas.measurementStart}
              selectedMeasurement={meas.selectedMeasurement}
              setSelectedMeasurement={meas.setSelectedMeasurement}
              axisConstraint={meas.axisConstraint}
              setAxisConstraint={meas.setAxisConstraint}
              isViewLocked={meas.isViewLocked}
              setIsViewLocked={meas.setIsViewLocked}
              isDraggingPoint={meas.isDraggingPoint}
              deleteSelectedMeasurement={meas.deleteSelectedMeasurement}
              pointCloud={pcm.pointCloud}
              cursorPosition={cursorPosition}
              scannerState={pcm.scannerState}
              selectedView={selectedView}
              unit={unit}
            />
          </div>
        </div>

        {/* Right Properties Panel */}
        <PropertiesPanel
          roomDimensions={pcm.roomDimensions}
          formatLength={fmtLength}
          formatArea={fmtArea}
          formatVolume={fmtVolume}
          unit={unit}
          modelRotation={pcm.modelRotation}
          handleRotateModel={pcm.handleRotateModel}
          handleResetRotation={pcm.handleResetRotation}
          measurements={meas.measurements}
          selectedMeasurement={meas.selectedMeasurement}
          setSelectedMeasurement={meas.setSelectedMeasurement}
          renamingMeasurement={meas.renamingMeasurement}
          renameValue={meas.renameValue}
          setRenameValue={meas.setRenameValue}
          renameInputRef={meas.renameInputRef}
          handleNameClick={meas.handleNameClick}
          handleRenameKeyDown={meas.handleRenameKeyDown}
          saveRename={meas.saveRename}
          deleteSelectedMeasurement={meas.deleteSelectedMeasurement}
          setActiveTool={setActiveTool}
          setMeasurements={meas.setMeasurements}
          clearMeasurements={meas.clearMeasurements}
          pointCloud={pcm.pointCloud}
          pointSize={pointSize}
          setPointSize={setPointSize}
          shadingMode={shadingMode}
          setShadingMode={setShadingMode}
        />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        scannerMessage={pcm.scannerMessage}
        pointCount={pcm.pointCount}
        scannerState={pcm.scannerState}
        getStateColor={getStateColor}
      />

      {/* Toast Notification */}
      <NotificationPopup notification={notification} />

      {/* Report Preview Modal */}
      <ReportPreviewModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        scanInfo={initialScan}
        roomDimensions={pcm.roomDimensions}
        measurements={meas.measurements}
        pointCount={pcm.pointCount}
        screenshotDataUrl={reportScreenshot}
        unit={unit}
      />
    </div>
  );
}
