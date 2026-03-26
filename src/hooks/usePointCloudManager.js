import { useState, useRef, useCallback } from 'react';
import { ScannerState } from '../constants';
import { processPlyBuffer } from '../utils/plyLoader';
import { rotatePointCloud } from '../utils/geometry';
import { generateDemoPointCloud } from '../utils/demoData';

export function usePointCloudManager() {
  // Scanner state
  const [scannerState, setScannerState] = useState(ScannerState.DISCONNECTED);
  const [scannerMessage, setScannerMessage] = useState('No scanner connected');
  const [connectionUrl, setConnectionUrl] = useState('');

  // Point cloud state
  const [pointCloud, setPointCloud] = useState([]);
  const [originalPointCloud, setOriginalPointCloud] = useState([]);
  const [modelRotation, setModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [pointCount, setPointCount] = useState(0);
  const [roomDimensions, setRoomDimensions] = useState({
    length: 6.000,
    width: 5.000,
    height: 2.800,
  });
  const [cameraHint, setCameraHint] = useState(null);

  const fileInputRef = useRef(null);

  // Scanner connection
  const connectToScanner = useCallback(async () => {
    setScannerState(ScannerState.CONNECTING);
    setScannerMessage('Connecting to scanner...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setScannerState(ScannerState.CONNECTED);
    setScannerMessage('Scanner connected - Ready to scan');
  }, []);

  const startScan = useCallback(async () => {
    if (scannerState !== ScannerState.CONNECTED && scannerState !== ScannerState.MODEL_LOADED) {
      return;
    }

    setScannerState(ScannerState.SCANNING);
    setScannerMessage('Scanning in progress...');
    setPointCloud([]);
    setPointCount(0);

    const totalPoints = 50000;
    const batches = 10;
    const pointsPerBatch = totalPoints / batches;

    for (let i = 0; i < batches; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const newPoints = generateDemoPointCloud(pointsPerBatch);
      setPointCloud(prev => [...prev, ...newPoints]);
      setPointCount(prev => prev + pointsPerBatch);
      setScannerMessage(`Scanning... ${Math.round(((i + 1) / batches) * 100)}%`);
    }

    setScannerState(ScannerState.PROCESSING);
    setScannerMessage('Processing point cloud...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setScannerState(ScannerState.MODEL_LOADED);
    setScannerMessage('Model loaded');
  }, [scannerState]);

  const disconnectScanner = useCallback(() => {
    setScannerState(ScannerState.DISCONNECTED);
    setScannerMessage('No scanner connected');
  }, []);

  const loadDemoData = useCallback(() => {
    setScannerState(ScannerState.PROCESSING);
    setScannerMessage('Loading living room demo...');

    setTimeout(() => {
      const demoPoints = generateDemoPointCloud();
      setPointCloud(demoPoints);
      setOriginalPointCloud(demoPoints);
      setModelRotation({ x: 0, y: 0, z: 0 });
      setPointCount(demoPoints.length);
      setRoomDimensions({ length: 6.000, width: 5.000, height: 2.800 });
      setScannerState(ScannerState.MODEL_LOADED);
      setScannerMessage('Living room demo loaded');
    }, 500);
  }, []);

  // Model rotation
  const handleRotateModel = useCallback((axis, degrees) => {
    if (pointCloud.length === 0) return;
    if (originalPointCloud.length === 0) {
      setOriginalPointCloud(pointCloud);
    }
    const { points: rotatedPoints, dimensions } = rotatePointCloud(pointCloud, axis, degrees);
    setPointCloud(rotatedPoints);
    if (dimensions) setRoomDimensions(dimensions);
    setModelRotation(prev => ({
      ...prev,
      [axis]: (prev[axis] + degrees) % 360
    }));
  }, [pointCloud, originalPointCloud]);

  const handleResetRotation = useCallback(() => {
    if (originalPointCloud.length === 0) return;
    setPointCloud(originalPointCloud);
    setModelRotation({ x: 0, y: 0, z: 0 });
    if (originalPointCloud.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      for (const p of originalPointCloud) {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
      }
      setRoomDimensions({
        length: maxX - minX,
        width: maxZ - minZ,
        height: maxY - minY
      });
    }
  }, [originalPointCloud]);

  // PLY loading (uses shared processPlyBuffer — no duplication)
  const loadPlyFromUrl = useCallback(async (url) => {
    setScannerState(ScannerState.PROCESSING);
    setScannerMessage('Loading PLY file...');

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const result = processPlyBuffer(arrayBuffer);

      setRoomDimensions(result.dimensions);
      setPointCloud(result.points);
      setOriginalPointCloud(result.points);
      setModelRotation({ x: 0, y: 0, z: 0 });
      setPointCount(result.points.length);
      setCameraHint(result.cameraHint || null);
      setScannerState(ScannerState.MODEL_LOADED);
      setScannerMessage('PLY model loaded');
    } catch (error) {
      console.error('Error loading PLY file:', error);
      setScannerState(ScannerState.ERROR);
      setScannerMessage(`Error: ${error.message}`);
    }
  }, []);

  const loadPlyFromFile = useCallback((file) => {
    setScannerState(ScannerState.PROCESSING);
    setScannerMessage('Loading PLY file...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = processPlyBuffer(event.target.result);

        setRoomDimensions(result.dimensions);
        setPointCloud(result.points);
        setOriginalPointCloud(result.points);
        setModelRotation({ x: 0, y: 0, z: 0 });
        setPointCount(result.points.length);
        setCameraHint(result.cameraHint || null);
        setScannerState(ScannerState.MODEL_LOADED);
        setScannerMessage(`Loaded: ${file.name}`);
      } catch (error) {
        console.error('Error parsing PLY file:', error);
        setScannerState(ScannerState.ERROR);
        setScannerMessage(`Error: ${error.message}`);
      }
    };

    reader.onerror = () => {
      setScannerState(ScannerState.ERROR);
      setScannerMessage('Error reading file');
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.ply')) {
      loadPlyFromFile(file);
    } else {
      setScannerMessage('Please select a .ply file');
    }
    event.target.value = '';
  }, [loadPlyFromFile]);

  return {
    // Scanner
    scannerState, scannerMessage, connectionUrl, setConnectionUrl,
    connectToScanner, startScan, disconnectScanner, loadDemoData,
    setScannerState, setScannerMessage,
    // Point cloud
    pointCloud, setPointCloud, originalPointCloud,
    modelRotation, pointCount, roomDimensions, cameraHint,
    fileInputRef,
    // Actions
    loadPlyFromUrl, loadPlyFromFile, handleFileSelect,
    handleRotateModel, handleResetRotation,
  };
}
