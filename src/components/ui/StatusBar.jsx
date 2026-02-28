import React from 'react';

const ScannerState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SCANNING: 'scanning',
  PROCESSING: 'processing',
  MODEL_LOADED: 'model_loaded',
  ERROR: 'error'
};

export default function StatusBar({
  scannerMessage,
  pointCount,
  scannerState,
  getStateColor,
}) {
  return (
      <div className="bg-zinc-800 border-t border-zinc-700 px-4 py-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className={getStateColor()}>{scannerMessage}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">Points: {pointCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">Accuracy: ±2mm</span>
          <span className="text-zinc-600">|</span>
          <span className={getStateColor()}>
            {scannerState === ScannerState.MODEL_LOADED ? '● Model Loaded' :
             scannerState === ScannerState.CONNECTED ? '● Connected' :
             scannerState === ScannerState.SCANNING ? '○ Scanning...' :
             scannerState === ScannerState.PROCESSING ? '○ Processing...' :
             scannerState === ScannerState.CONNECTING ? '○ Connecting...' :
             '○ Disconnected'}
          </span>
        </div>
      </div>
  );
}
