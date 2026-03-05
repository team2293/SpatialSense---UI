import React, { useState, useRef, useCallback } from 'react';

// Mock cloud scan data (local scans come from imported files)
const CLOUD_SCANS = [
  {
    id: 'cloud-1',
    name: 'Office Suite 200 - Main St',
    date: '2026-02-28',
    fileSize: '24.6 MB',
    pointCount: '2.4M points',
    type: 'demo',
  },
  {
    id: 'cloud-2',
    name: 'Lobby - Riverside Complex',
    date: '2026-02-25',
    fileSize: '18.3 MB',
    pointCount: '1.8M points',
    type: 'demo',
  },
  {
    id: 'cloud-3',
    name: 'Conference Room B',
    date: '2026-02-20',
    fileSize: '6.2 MB',
    pointCount: '620K points',
    type: 'demo',
  },
  {
    id: 'cloud-4',
    name: 'Warehouse Floor 1',
    date: '2026-02-15',
    fileSize: '45.1 MB',
    pointCount: '4.5M points',
    type: 'demo',
  },
];

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Icons
const RoomIcon = () => (
  <svg className="w-10 h-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
  </svg>
);

const UsbIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v6m0 0l-2-2m2 2l2-2M8 12H4m0 0l2-2m-2 2l2 2m12-2h-4m0 0l2-2m-2 2l2 2M12 16v6m0 0l-2-2m2 2l2-2" />
  </svg>
);

const CloudIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-10 h-10 text-orange-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

export default function ScanDashboard({ onSelectScan, onNewScan }) {
  const [source, setSource] = useState('local');
  const [importedFiles, setImportedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const scans = source === 'local' ? importedFiles : CLOUD_SCANS;

  const addFiles = useCallback((files) => {
    const plyFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.ply'));
    if (plyFiles.length === 0) return;

    const newScans = plyFiles
      .filter(f => !importedFiles.some(existing => existing.name === f.name && existing.fileSize === formatFileSize(f.size)))
      .map((f, i) => ({
        id: `imported-${Date.now()}-${i}`,
        name: f.name.replace('.ply', '').replace(/[-_]/g, ' '),
        date: formatDate(new Date(f.lastModified)),
        fileSize: formatFileSize(f.size),
        pointCount: '—',
        type: 'file',
        file: f,
      }));

    if (newScans.length > 0) {
      setImportedFiles(prev => [...prev, ...newScans]);
    }
  }, [importedFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileInput = useCallback((e) => {
    addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const removeImportedFile = useCallback((id, e) => {
    e.stopPropagation();
    setImportedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  return (
    <div className="w-full h-screen bg-zinc-900 flex flex-col font-sans text-sm overflow-auto">

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept=".ply"
        multiple
        className="hidden"
      />

      {/* Header */}
      <div className="border-b border-zinc-700 bg-zinc-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              <span className="text-orange-500">Spatial</span>Sense
            </h1>
            <p className="text-zinc-500 text-xs mt-0.5">3D Room Scanner for Construction</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            System Ready
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6">
        <div>

          {/* Source Toggle + Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1 border border-zinc-700">
              <button
                onClick={() => setSource('local')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  source === 'local'
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <UsbIcon />
                Local (USB-C)
              </button>
              <button
                onClick={() => setSource('cloud')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  source === 'cloud'
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <CloudIcon />
                Cloud (AWS)
              </button>
            </div>

            <div className="flex items-center gap-3">
              {source === 'local' && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <UploadIcon className="w-4 h-4" />
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Import Files
                  </button>
                  <button
                    onClick={onNewScan}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <PlusIcon />
                    New Scan
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Source Info Banner */}
          <div className="mb-4 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg">
            {source === 'local' ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-zinc-300 text-xs">
                  Connected to Jetson Nano via USB-C &mdash; <span className="text-zinc-500">10.0.0.1:8000</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-zinc-300 text-xs">
                  Connected to SpatialSense Cloud &mdash; <span className="text-zinc-500">us-east-1</span>
                </span>
              </div>
            )}
          </div>

          {/* Section Title */}
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">
            {source === 'local' ? 'Scans on Device' : 'Cloud Scans'}
            <span className="text-zinc-600 ml-2">({scans.length})</span>
          </h2>

          {/* Local: Drop zone + imported files */}
          {source === 'local' && scans.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/5'
                  : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50'
              }`}
            >
              <UploadIcon />
              <p className="text-zinc-300 mt-3 font-medium">
                {isDragging ? 'Drop PLY files here' : 'Drag & drop PLY files here'}
              </p>
              <p className="text-zinc-500 text-xs mt-1">or click to browse</p>
            </div>
          )}

          {/* Scan Grid (with drop zone active in background for local) */}
          {scans.length > 0 && (
            <div
              onDragOver={source === 'local' ? handleDragOver : undefined}
              onDragLeave={source === 'local' ? handleDragLeave : undefined}
              onDrop={source === 'local' ? handleDrop : undefined}
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 rounded-xl transition-colors ${
                isDragging ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-900' : ''
              }`}
            >
              {scans.map((scan) => (
                <button
                  key={scan.id}
                  onClick={() => onSelectScan(scan)}
                  className="text-left bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-orange-500/50 hover:bg-zinc-750 transition-all group cursor-pointer relative"
                >
                  {/* Remove button for imported files */}
                  {scan.type === 'file' && (
                    <div
                      onClick={(e) => removeImportedFile(scan.id, e)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-zinc-700 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <svg className="w-3 h-3 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}

                  {/* Thumbnail Placeholder */}
                  <div className="w-full h-32 bg-zinc-900 rounded-md mb-3 flex items-center justify-center border border-zinc-700 group-hover:border-zinc-600">
                    {scan.type === 'file' ? <FileIcon /> : <RoomIcon />}
                  </div>

                  {/* Scan Info */}
                  <h3 className="text-white font-medium text-sm truncate group-hover:text-orange-400 transition-colors">
                    {scan.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    <span>{scan.date}</span>
                    <span className="text-zinc-700">|</span>
                    <span>{scan.fileSize}</span>
                    {scan.pointCount !== '—' && (
                      <>
                        <span className="text-zinc-700">|</span>
                        <span>{scan.pointCount}</span>
                      </>
                    )}
                  </div>

                  {/* Source badge */}
                  <div className="mt-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                      source === 'local'
                        ? 'bg-zinc-700 text-zinc-300'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {source === 'local' ? <UsbIcon /> : <CloudIcon />}
                      {source === 'local' ? 'Local' : 'Cloud'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-700 bg-zinc-800 px-8 py-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>SpatialSense v1.0 &mdash; Senior Design 2026</span>
          <span>Orbec 3D Scanner Interface</span>
        </div>
      </div>
    </div>
  );
}
