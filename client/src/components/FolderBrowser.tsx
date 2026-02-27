import { useState, useEffect, useCallback, useRef } from 'react';
import { listDirectory, DirectoryEntry, GitInfo } from '../api/sessions';

interface Props {
  onPathChange: (path: string, isGitRepo: boolean) => void;
}

export default function FolderBrowser({ onPathChange }: Props) {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState('');
  const onPathChangeRef = useRef(onPathChange);
  onPathChangeRef.current = onPathChange;

  const loadDir = useCallback(async (dirPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDirectory(dirPath);
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setIsGitRepo(data.isGitRepo);
      setGitInfo(data.gitInfo || null);
      setEntries(data.entries);
      setPathInput(data.currentPath);
      onPathChangeRef.current(data.currentPath, data.isGitRepo);
      try { localStorage.setItem('claudit:lastBrowserPath', data.currentPath); } catch {}
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = (() => { try { return localStorage.getItem('claudit:lastBrowserPath'); } catch { return null; } })();
    loadDir(saved || undefined);
  }, [loadDir]);

  const handleGo = () => {
    if (pathInput.trim()) {
      loadDir(pathInput.trim());
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Path input */}
      <div className="flex gap-1">
        <input
          value={pathInput}
          onChange={e => setPathInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleGo(); }}
          className="flex-1 text-sm bg-gray-800 text-gray-200 px-2 py-1.5 rounded border border-gray-600 outline-none focus:border-blue-500 font-mono"
          placeholder="/path/to/directory"
        />
        <button
          onClick={handleGo}
          className="text-xs px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          Go
        </button>
      </div>

      {/* Current path + git info */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="truncate font-mono">{currentPath}</span>
        {gitInfo && (
          <span className="flex items-center gap-1 flex-shrink-0 ml-auto text-orange-400">
            <span>{gitInfo.repoName}</span>
            <span className="text-gray-600">/</span>
            <span>{gitInfo.branch}</span>
          </span>
        )}
      </div>

      {/* Parent navigation */}
      {parentPath && (
        <button
          onClick={() => loadDir(parentPath)}
          className="text-left text-xs text-blue-400 hover:text-blue-300 px-2 py-1"
        >
          .. (parent directory)
        </button>
      )}

      {/* Directory listing */}
      <div className="max-h-60 overflow-y-auto border border-gray-700 rounded">
        {loading && (
          <div className="p-3 text-xs text-gray-500">Loading...</div>
        )}
        {error && (
          <div className="p-3 text-xs text-red-400">{error}</div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className="p-3 text-xs text-gray-500">No subdirectories</div>
        )}
        {!loading && !error && entries.map(entry => (
          <button
            key={entry.path}
            onClick={() => loadDir(entry.path)}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2 border-b border-gray-800/50 last:border-b-0"
          >
            <span className="text-gray-500 text-xs">📁</span>
            <span className="truncate">{entry.name}</span>
            {entry.gitInfo && (
              <span className="ml-auto flex-shrink-0 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                {entry.gitInfo.branch}
              </span>
            )}
          </button>
        ))}
      </div>

    </div>
  );
}
