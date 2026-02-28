import { useState, useRef, useCallback } from 'react';

export function useMeasurements({ setActiveTool }) {
  const [measurements, setMeasurements] = useState([]);
  const [measurementStart, setMeasurementStart] = useState(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [axisConstraint, setAxisConstraint] = useState(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [isViewLocked, setIsViewLocked] = useState(false);

  // Rename state
  const [renamingMeasurement, setRenamingMeasurement] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameClickTimer = useRef(null);
  const renameInputRef = useRef(null);

  const handleMeasurePoint = useCallback((point) => {
    if (!measurementStart) {
      setMeasurementStart(point);
    } else {
      const distance = Math.sqrt(
        Math.pow(point[0] - measurementStart[0], 2) +
        Math.pow(point[1] - measurementStart[1], 2) +
        Math.pow(point[2] - measurementStart[2], 2)
      );

      const newId = Date.now();
      const newMeasurement = {
        id: newId,
        name: `M${measurements.length + 1}`,
        start: measurementStart,
        end: point,
        distance: `${distance.toFixed(3)}m`,
        points: `Point ${measurements.length * 2 + 1} → Point ${measurements.length * 2 + 2}`
      };

      setMeasurements(prev => [...prev, newMeasurement]);
      setMeasurementStart(null);
      setSelectedMeasurement(newId);
      setActiveTool('select');
    }
  }, [measurementStart, measurements, setActiveTool]);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setMeasurementStart(null);
    setSelectedMeasurement(null);
  }, []);

  const updateMeasurementPoint = useCallback((measurementId, pointType, newPosition) => {
    setMeasurements(prev => prev.map(m => {
      if (m.id !== measurementId) return m;

      const updated = { ...m };
      if (pointType === 'start') {
        updated.start = newPosition;
      } else {
        updated.end = newPosition;
      }

      const distance = Math.sqrt(
        Math.pow(updated.end[0] - updated.start[0], 2) +
        Math.pow(updated.end[1] - updated.start[1], 2) +
        Math.pow(updated.end[2] - updated.start[2], 2)
      );
      updated.distance = `${distance.toFixed(3)}m`;

      return updated;
    }));
  }, []);

  const deleteSelectedMeasurement = useCallback(() => {
    if (selectedMeasurement) {
      setMeasurements(prev => prev.filter(m => m.id !== selectedMeasurement));
      setSelectedMeasurement(null);
    }
  }, [selectedMeasurement]);

  const startRename = useCallback((measurementId, currentName) => {
    setRenamingMeasurement(measurementId);
    setRenameValue(currentName);
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 0);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingMeasurement(null);
    setRenameValue('');
    if (renameClickTimer.current) {
      clearTimeout(renameClickTimer.current);
      renameClickTimer.current = null;
    }
  }, []);

  const saveRename = useCallback(() => {
    if (renamingMeasurement && renameValue.trim()) {
      setMeasurements(prev => prev.map(m =>
        m.id === renamingMeasurement ? { ...m, name: renameValue.trim() } : m
      ));
    }
    setRenamingMeasurement(null);
    setRenameValue('');
  }, [renamingMeasurement, renameValue]);

  const handleNameClick = useCallback((e, measurementId, currentName) => {
    e.stopPropagation();
    if (renamingMeasurement === measurementId) return;

    if (selectedMeasurement === measurementId) {
      if (renameClickTimer.current) {
        clearTimeout(renameClickTimer.current);
      }
      renameClickTimer.current = setTimeout(() => {
        startRename(measurementId, currentName);
      }, 300);
    } else {
      setSelectedMeasurement(measurementId);
    }
  }, [renamingMeasurement, selectedMeasurement, startRename]);

  const handleRenameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
    e.stopPropagation();
  }, [saveRename, cancelRename]);

  return {
    measurements, setMeasurements, measurementStart, setMeasurementStart,
    selectedMeasurement, setSelectedMeasurement,
    axisConstraint, setAxisConstraint,
    isDraggingPoint, setIsDraggingPoint,
    isViewLocked, setIsViewLocked,
    renamingMeasurement, renameValue, setRenameValue, renameInputRef,
    handleMeasurePoint, clearMeasurements, updateMeasurementPoint,
    deleteSelectedMeasurement,
    startRename, cancelRename, saveRename,
    handleNameClick, handleRenameKeyDown,
  };
}
