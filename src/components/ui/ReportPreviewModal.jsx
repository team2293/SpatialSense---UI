import React, { useEffect, useState } from 'react';
import { generateReportPdf, getReportFilename } from '../../utils/reportGenerator';

export default function ReportPreviewModal({
  isOpen,
  onClose,
  scanInfo,
  roomDimensions,
  measurements,
  pointCount,
  screenshotDataUrl,
  unit,
}) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [docRef, setDocRef] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const doc = generateReportPdf({
      scanInfo,
      roomDimensions,
      measurements,
      pointCount,
      screenshotDataUrl,
      unit,
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    setDocRef(doc);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, scanInfo, roomDimensions, measurements, pointCount, screenshotDataUrl, unit]);

  const handleDownload = () => {
    if (!docRef) return;
    docRef.save(getReportFilename(scanInfo));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div>
            <h2 className="text-white text-lg font-semibold">Report Preview</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Review the report before downloading
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 bg-zinc-800 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Report Preview"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-10 h-10 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-zinc-400 text-sm">Generating report...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
