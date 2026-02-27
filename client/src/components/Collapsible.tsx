import { useState, ReactNode } from 'react';

interface Props {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  storageKey?: string;
  children: ReactNode;
}

function loadState(key?: string, defaultOpen?: boolean): boolean {
  if (!key) return defaultOpen ?? true;
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) return saved === 'true';
  } catch {}
  return defaultOpen ?? true;
}

export default function Collapsible({ title, count, defaultOpen, storageKey, children }: Props) {
  const [open, setOpen] = useState(() => loadState(storageKey, defaultOpen));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey) {
      try { localStorage.setItem(storageKey, String(next)); } catch {}
    }
  };

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-300 transition-colors mb-2"
      >
        <span className="text-xs text-gray-600">{open ? '▾' : '▸'}</span>
        <span>{title}</span>
        {count !== undefined && (
          <span className="text-xs text-gray-600">({count})</span>
        )}
      </button>
      {open && children}
    </div>
  );
}
