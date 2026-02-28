import React from 'react';

export default function ViewTabs({
  views,
  selectedView,
  setSelectedView,
  unit,
  setUnit,
}) {
  return (
          <div className="bg-zinc-800 border-b border-zinc-700 px-2 py-1 flex items-center gap-1">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setSelectedView(view.id)}
                className={`px-4 py-1.5 rounded-t text-xs font-medium transition ${
                  selectedView === view.id
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {view.label}
              </button>
            ))}
            <div className="flex-1"></div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-zinc-500 mr-1">Units:</span>
              <button
                onClick={() => setUnit('meters')}
                className={`px-2 py-0.5 rounded transition ${
                  unit === 'meters'
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                meters
              </button>
              <button
                onClick={() => setUnit('feet')}
                className={`px-2 py-0.5 rounded transition ${
                  unit === 'feet'
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                feet
              </button>
            </div>
          </div>
  );
}
