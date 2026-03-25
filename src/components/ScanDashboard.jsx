import React, { useState, useRef, useCallback, useEffect } from 'react';
import { listCloudScans, downloadPlyFromS3 } from '../services/s3Service';

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

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

export default function ScanDashboard({ onSelectScan, onNewScan }) {
  const [source, setSource] = useState(null); // null = no source selected yet
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [importedFiles, setImportedFiles] = useState([]);
  const [cloudScans, setCloudScans] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const loadMenuRef = useRef(null);

  const scans = source === 'cloud' ? cloudScans : importedFiles;

  // Close load menu on outside click
  useEffect(() => {
    if (!showLoadMenu) return;
    const handleClick = (e) => {
      if (loadMenuRef.current && !loadMenuRef.current.contains(e.target)) {
        setShowLoadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showLoadMenu]);

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
      setSource('local');
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

  const handleLoadLocal = useCallback(() => {
    setShowLoadMenu(false);
    setSource('local');
    fileInputRef.current?.click();
  }, []);

  const handleLoadCloud = useCallback(async () => {
    setShowLoadMenu(false);
    setSource('cloud');
    setCloudLoading(true);
    setCloudError('');
    try {
      const scans = await listCloudScans();
      setCloudScans(scans);
    } catch (err) {
      setCloudError(err.message);
    } finally {
      setCloudLoading(false);
    }
  }, []);

  const handleSelectCloudScan = useCallback(async (scan) => {
    if (!scan.s3Key) {
      onSelectScan(scan);
      return;
    }
    try {
      const blob = await downloadPlyFromS3(scan.s3Key);
      const file = new File([blob], `${scan.name}.ply`, { type: 'application/octet-stream' });
      onSelectScan({ ...scan, file });
    } catch (err) {
      setCloudError(`Failed to download: ${err.message}`);
    }
  }, [onSelectScan]);

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

          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative" ref={loadMenuRef}>
              <button
                onClick={() => setShowLoadMenu(!showLoadMenu)}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
              >
                <FolderIcon />
                Load Model
                <svg className={`w-4 h-4 text-zinc-400 transition-transform ${showLoadMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showLoadMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={handleLoadLocal}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 transition-colors text-left"
                  >
                    <UsbIcon />
                    <div>
                      <div className="text-zinc-200 text-sm font-medium">From Device</div>
                      <div className="text-zinc-500 text-xs">Browse local PLY files</div>
                    </div>
                  </button>
                  <div className="border-t border-zinc-700" />
                  <button
                    onClick={handleLoadCloud}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 transition-colors text-left"
                  >
                    <CloudIcon />
                    <div>
                      <div className="text-zinc-200 text-sm font-medium">From Cloud</div>
                      <div className="text-zinc-500 text-xs">Browse AWS cloud scans</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onNewScan}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon />
              New Scan
            </button>
          </div>

          {/* Source Info Banner — only shown when a source is active */}
          {source && (
            <div className="mb-4 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-between">
              {source === 'local' ? (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-zinc-300 text-xs">
                    Showing local files
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
              {source === 'local' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-orange-400 hover:text-orange-300 text-xs font-medium"
                >
                  + Import More
                </button>
              )}
            </div>
          )}

          {/* Cloud error */}
          {cloudError && source === 'cloud' && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
              <p className="text-red-400 text-sm">{cloudError}</p>
              <button onClick={() => setCloudError('')} className="text-red-400 hover:text-red-300 text-xs ml-4">
                Dismiss
              </button>
            </div>
          )}

          {/* Section Title */}
          {source && !cloudLoading && (
            <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">
              {source === 'local' ? 'Local Files' : 'Cloud Scans'}
              <span className="text-zinc-600 ml-2">({scans.length})</span>
            </h2>
          )}

          {/* Empty state — no source selected */}
          {!source && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center transition-colors ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/5'
                  : 'border-zinc-700 bg-zinc-800/30'
              }`}
            >
              <UploadIcon />
              <p className="text-zinc-300 mt-4 font-medium text-base">
                {isDragging ? 'Drop PLY files here' : 'Get started'}
              </p>
              <p className="text-zinc-500 text-xs mt-1.5 text-center max-w-sm">
                Click <strong className="text-zinc-400">Load Model</strong> to open a local file or browse cloud scans, or drag & drop PLY files here.
              </p>
            </div>
          )}

          {/* Cloud: loading state */}
          {source === 'cloud' && cloudLoading && (
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-12 flex flex-col items-center justify-center">
              <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-zinc-300 mt-3 font-medium">Connecting to AWS...</p>
              <p className="text-zinc-500 text-xs mt-1">Fetching scans from S3 bucket</p>
            </div>
          )}

          {/* Cloud: empty state */}
          {source === 'cloud' && !cloudLoading && scans.length === 0 && !cloudError && (
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-12 flex flex-col items-center justify-center">
              <CloudIcon />
              <p className="text-zinc-300 mt-3 font-medium">No scans found</p>
              <p className="text-zinc-500 text-xs mt-1">The S3 bucket is empty or credentials need to be configured</p>
              <button
                onClick={handleLoadCloud}
                className="mt-4 text-blue-400 hover:text-blue-300 text-xs font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Local: empty file list with drop zone */}
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

          {/* Scan Grid */}
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
                  onClick={() => scan.s3Key ? handleSelectCloudScan(scan) : onSelectScan(scan)}
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
                      scan.type === 'file'
                        ? 'bg-zinc-700 text-zinc-300'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {scan.type === 'file' ? <UsbIcon /> : <CloudIcon />}
                      {scan.type === 'file' ? 'Local' : 'Cloud'}
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
