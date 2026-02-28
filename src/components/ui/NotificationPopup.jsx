import React from 'react';

export default function NotificationPopup({
  notification,
}) {
  return (
    <>
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-2xl border backdrop-blur-sm ${
            notification.type === 'error'
              ? 'bg-red-900/90 border-red-700 text-red-100'
              : 'bg-zinc-800/95 border-zinc-600 text-white'
          }`}>
            {notification.type === 'error' ? (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Notification animation */}
      <style>{`
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translate(-50%, -12px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in {
          animation: fade-in-down 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
