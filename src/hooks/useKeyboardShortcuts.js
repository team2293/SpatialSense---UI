import { useEffect } from 'react';

export function useKeyboardShortcuts({
  selectedMeasurement, measurementStart, renamingMeasurement,
  setAxisConstraint, setIsViewLocked, deleteSelectedMeasurement,
  setMeasurementStart, setActiveTool, setSelectedMeasurement,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (renamingMeasurement) return;

      // Global axis constraint shortcuts: Shift+Cmd+X/Y/Z
      if (event.shiftKey && (event.metaKey || event.ctrlKey)) {
        switch (event.key.toLowerCase()) {
          case 'x':
            event.preventDefault();
            setAxisConstraint(prev => prev === 'x' ? null : 'x');
            return;
          case 'y':
            event.preventDefault();
            setAxisConstraint(prev => prev === 'y' ? null : 'y');
            return;
          case 'z':
            event.preventDefault();
            setAxisConstraint(prev => prev === 'z' ? null : 'z');
            return;
        }
      }

      // Only handle if a measurement is selected
      if (selectedMeasurement) {
        switch (event.key.toLowerCase()) {
          case 'x':
            setAxisConstraint(prev => prev === 'x' ? null : 'x');
            break;
          case 'y':
            setAxisConstraint(prev => prev === 'y' ? null : 'y');
            break;
          case 'z':
            setAxisConstraint(prev => prev === 'z' ? null : 'z');
            break;
          case 'l':
            setIsViewLocked(prev => !prev);
            break;
          case 'delete':
          case 'backspace':
            deleteSelectedMeasurement();
            break;
          case 'escape':
            setSelectedMeasurement(null);
            setAxisConstraint(null);
            break;
        }
      }

      // Cancel measurement in progress with Escape
      if (event.key === 'Escape' && measurementStart) {
        setMeasurementStart(null);
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMeasurement, measurementStart, deleteSelectedMeasurement, renamingMeasurement,
      setAxisConstraint, setIsViewLocked, setMeasurementStart, setActiveTool, setSelectedMeasurement]);
}
