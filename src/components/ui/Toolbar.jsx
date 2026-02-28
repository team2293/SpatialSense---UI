import React from 'react';

export default function Toolbar({
  tools,
  activeTool,
  setActiveTool,
  showGrid,
  setShowGrid,
  showDimensions,
  setShowDimensions,
}) {
  return (
        <div className="w-12 bg-zinc-800 border-r border-zinc-700 flex flex-col items-center py-2 gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-10 h-10 rounded flex items-center justify-center transition group relative ${
                activeTool === tool.id
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
              title={tool.label}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tool.icon} />
              </svg>
              <span className="absolute left-12 bg-zinc-700 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                {tool.label}
              </span>
            </button>
          ))}

          <div className="flex-1"></div>

          <div className="w-8 h-px bg-zinc-700 my-2"></div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`w-10 h-10 rounded flex items-center justify-center transition ${
              showGrid ? 'text-orange-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Grid"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>

          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`w-10 h-10 rounded flex items-center justify-center transition ${
              showDimensions ? 'text-orange-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Dimensions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
  );
}
