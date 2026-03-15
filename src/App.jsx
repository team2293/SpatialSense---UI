import { useState } from 'react';
import ScanDashboard from './components/ScanDashboard';
import SpatialSense from './components/SpatialSense';
import NewScanView from './components/NewScanView';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedScan, setSelectedScan] = useState(null);

  const handleSelectScan = (scan) => {
    setSelectedScan(scan);
    setCurrentPage('viewer');
  };

  const handleNewScan = () => {
    setCurrentPage('newScan');
  };

  const handleBackToDashboard = () => {
    setSelectedScan(null);
    setCurrentPage('dashboard');
  };

  const handleScanComplete = (file) => {
    // Skip loading an empty mock file into the viewer
    if (file.size === 0) {
      setCurrentPage('dashboard');
      return;
    }
    const scan = {
      id: `scan-${Date.now()}`,
      name: file.name.replace('.ply', '').replace(/[-_]/g, ' '),
      date: new Date().toISOString().split('T')[0],
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      pointCount: '—',
      type: 'file',
      file,
    };
    setSelectedScan(scan);
    setCurrentPage('viewer');
  };

  if (currentPage === 'newScan') {
    return (
      <NewScanView
        onBack={handleBackToDashboard}
        onScanComplete={handleScanComplete}
      />
    );
  }

  if (currentPage === 'viewer') {
    return (
      <SpatialSense
        initialScan={selectedScan}
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <ScanDashboard
      onSelectScan={handleSelectScan}
      onNewScan={handleNewScan}
    />
  );
}
