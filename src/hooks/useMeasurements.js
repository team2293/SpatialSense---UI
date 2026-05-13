import { useState, useRef, useCallback } from 'react';

export function useMeasurements({ setActiveTool }) {
  const [measurements, setMeasurements] = useState([]);
  // Area entries derived from closed polygons and "promoted" by the user
  // (clicked from the viewport). Separate from line measurements so the
  // existing line-only consumers (export, projectIO, drag-to-edit) don't
  // need to learn about a discriminator field.
  const [areaMeasurements, setAreaMeasurements] = useState([]);
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
    setAreaMeasurements([]);
    setMeasurementStart(null);
    setSelectedMeasurement(null);
  }, []);

  // Promote a derived polygon (from PolygonAreaLabels) into a named, persistent
  // entry in the measurements list. Snapshots the polygon's vertices/area so
  // deleting one of the underlying lines later doesn't erase the saved value.
  const promotePolygon = useCallback((polygon) => {
    const id = `area-${Date.now()}`;
    setAreaMeasurements(prev => {
      // Avoid duplicates if the user clicks the same polygon twice.
      const sig = polygon.vertices.map(v => v.map(c => c.toFixed(3)).join(',')).sort().join('|');
      const existing = prev.find(a => a._sig === sig);
      if (existing) {
        // Re-trigger rename on the existing one instead of adding a duplicate.
        setSelectedMeasurement(existing.id);
        setRenamingMeasurement(existing.id);
        setRenameValue(existing.name);
        setTimeout(() => {
          if (renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
          }
        }, 0);
        return prev;
      }
      const newArea = {
        id,
        kind: 'area',
        name: `A${prev.length + 1}`,
        vertices: polygon.vertices.map(v => [...v]),
        area: polygon.area,
        centroid: [...polygon.centroid],
        _sig: sig,
      };
      setSelectedMeasurement(id);
      setRenamingMeasurement(id);
      setRenameValue(newArea.name);
      setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus();
          renameInputRef.current.select();
        }
      }, 0);
      return [...prev, newArea];
    });
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
      setAreaMeasurements(prev => prev.filter(a => a.id !== selectedMeasurement));
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
      const trimmed = renameValue.trim();
      setMeasurements(prev => prev.map(m =>
        m.id === renamingMeasurement ? { ...m, name: trimmed } : m
      ));
      setAreaMeasurements(prev => prev.map(a =>
        a.id === renamingMeasurement ? { ...a, name: trimmed } : a
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
    areaMeasurements, setAreaMeasurements, promotePolygon,
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
