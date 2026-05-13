import React, { useEffect, useRef, useState } from 'react';
import { generateReportPdf, getReportFilename } from '../../utils/reportGenerator';
import { downloadReportJSON, downloadReportCSV } from '../../utils/export';

export default function ReportPreviewModal({
  isOpen,
  onClose,
  scanInfo,
  roomDimensions,
  measurements,
  areaMeasurements,
  pointCount,
  screenshotDataUrl,
  additionalViews,
  unit,
}) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [docRef, setDocRef] = useState(null);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const formatMenuRef = useRef(null);

  // Close the format dropdown when clicking outside it.
  useEffect(() => {
    if (!formatMenuOpen) return;
    const handleClickOutside = (e) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target)) {
        setFormatMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [formatMenuOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const doc = generateReportPdf({
      scanInfo,
      roomDimensions,
      measurements,
      areaMeasurements,
      pointCount,
      screenshotDataUrl,
      additionalViews,
      unit,
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    setDocRef(doc);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, scanInfo, roomDimensions, measurements, areaMeasurements, pointCount, screenshotDataUrl, additionalViews, unit]);

  const handleDownloadPDF = () => {
    if (!docRef) return;
    docRef.save(getReportFilename(scanInfo));
    setFormatMenuOpen(false);
  };

  const handleDownloadJSON = () => {
    downloadReportJSON({ scanInfo, roomDimensions, measurements, areaMeasurements, pointCount, unit });
    setFormatMenuOpen(false);
  };

  const handleDownloadCSV = () => {
    downloadReportCSV({ scanInfo, roomDimensions, measurements, areaMeasurements, pointCount, unit });
    setFormatMenuOpen(false);
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
            {/* Split-button: main click = PDF; chevron opens CSV/JSON */}
            <div ref={formatMenuRef} className="relative flex">
              <button
                onClick={handleDownloadPDF}
                className="pl-4 pr-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-l-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download PDF
              </button>
              <button
                onClick={() => setFormatMenuOpen((o) => !o)}
                className="px-2 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-r-md border-l border-orange-700/40 transition-colors flex items-center"
                title="Other formats"
                aria-haspopup="menu"
                aria-expanded={formatMenuOpen}
              >
                <svg className={`w-4 h-4 transition-transform ${formatMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {formatMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-xl z-10 overflow-hidden">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <span className="font-mono text-xs text-zinc-500 w-9">PDF</span>
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <span className="font-mono text-xs text-zinc-500 w-9">CSV</span>
                    <span>Download CSV</span>
                  </button>
                  <button
                    onClick={handleDownloadJSON}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <span className="font-mono text-xs text-zinc-500 w-9">JSON</span>
                    <span>Download JSON</span>
                  </button>
                </div>
              )}
            </div>
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
