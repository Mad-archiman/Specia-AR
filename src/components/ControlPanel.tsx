'use client';

import { useState } from 'react';
import type { MeshItem } from '@/types/mesh';

interface ControlPanelProps {
  className?: string;
  meshItems: MeshItem[];
  setMeshItems: React.Dispatch<React.SetStateAction<MeshItem[]>>;
}

export function ControlPanel({ className = '', meshItems, setMeshItems }: ControlPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const handleOpacityChange = (id: string, value: number) => {
    setMeshItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, opacity: value } : p))
    );
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm ${className}`}
      role="toolbar"
      aria-label="AR 컨트롤"
    >
      {meshItems.length === 0 ? (
        <div className="p-4">
          <p className="text-center text-sm text-white/70">파일을 추가하여 AR을 경험하세요.</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between p-4 text-left text-sm text-white transition-opacity hover:opacity-90"
            aria-expanded={expanded}
            aria-label={expanded ? '투명도 패널 접기' : '투명도 패널 펼치기'}
          >
            <span>투명도 조절 ({meshItems.length}개)</span>
            <span className="tabular-nums transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>
              ▼
            </span>
          </button>
          {expanded && (
            <div className="max-h-[40vh] overflow-y-auto border-t border-white/20 p-4">
              <ul className="space-y-4">
                {meshItems.map((item) => (
                  <li key={item.id} className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-white truncate" title={item.name}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={item.opacity}
                        onChange={(e) => handleOpacityChange(item.id, Number(e.target.value))}
                        className="flex-1 h-2 rounded-full appearance-none bg-white/20 accent-white"
                        aria-label={`${item.name} opacity`}
                      />
                      <span className="text-xs text-white/80 tabular-nums w-8">
                        {Math.round(item.opacity * 100)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
