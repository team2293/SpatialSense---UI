import { useState } from 'react';
import ScanDashboard from './components/ScanDashboard';
import SpatialSense from './components/SpatialSense';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedScan, setSelectedScan] = useState(null);

  const handleSelectScan = (scan) => {
    setSelectedScan(scan);
    setCurrentPage('viewer');
  };

  const handleNewScan = () => {
    setSelectedScan(null);
    setCurrentPage('viewer');
  };

  const handleBackToDashboard = () => {
    setSelectedScan(null);
    setCurrentPage('dashboard');
  };

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
