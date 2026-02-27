import { ReactNode, useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'claudit:sidebar-width';
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 300;

function loadWidth(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const n = Number(saved);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch {}
  return DEFAULT_WIDTH;
}

interface Props {
  nav: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
}

export default function Layout({ nav, sidebar, main }: Props) {
  const [sidebarWidth, setSidebarWidth] = useState(loadWidth);
  const dragging = useRef(false);
  const widthRef = useRef(sidebarWidth);

  // Keep ref in sync with state for use in listeners
  widthRef.current = sidebarWidth;

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.classList.add('select-none');
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - 56));
      setSidebarWidth(newWidth);
      widthRef.current = newWidth;
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.classList.remove('select-none');
      try { localStorage.setItem(STORAGE_KEY, String(widthRef.current)); } catch {}
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      // Clean up select-none on unmount if drag was in progress
      if (dragging.current) {
        document.body.classList.remove('select-none');
      }
    };
  }, []); // stable — uses refs, no state dependency

  return (
    <div
      className="h-screen grid"
      style={{ gridTemplateColumns: `56px ${sidebarWidth}px 4px 1fr` }}
    >
      <nav className="border-r border-gray-800 bg-gray-950 flex flex-col items-center py-4">
        {nav}
      </nav>
      <aside className="border-r border-gray-800 overflow-y-auto bg-gray-900">
        {sidebar}
      </aside>
      <div
        onMouseDown={onMouseDown}
        className="cursor-col-resize bg-transparent hover:bg-blue-500/40 transition-colors"
      />
      <main className="overflow-hidden flex flex-col">
        {main}
      </main>
    </div>
  );
}
