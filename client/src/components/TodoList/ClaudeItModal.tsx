import { useState, useCallback } from 'react';
import FolderBrowser from '../FolderBrowser';

interface Props {
  onSelect: (projectPath: string, worktree?: { branchName: string }) => void;
  onClose: () => void;
}

export default function ClaudeItModal({ onSelect, onClose }: Props) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [useWorktree, setUseWorktree] = useState(false);
  const [branchName, setBranchName] = useState('');

  const handlePathChange = useCallback((path: string, gitRepo: boolean) => {
    setCurrentPath(path);
    setIsGitRepo(gitRepo);
    if (!gitRepo) {
      setUseWorktree(false);
      setBranchName('');
    }
  }, []);

  const handleStart = () => {
    if (!currentPath) return;
    // Save confirmed selection path so next time the browser opens here
    try { localStorage.setItem('claudit:lastBrowserPath', currentPath); } catch {}
    const worktree = useWorktree && branchName.trim()
      ? { branchName: branchName.trim() }
      : undefined;
    onSelect(currentPath, worktree);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-[480px] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-gray-200 mb-1">Claudit</h2>
        <p className="text-xs text-gray-400 mb-4">Pick a project directory to start a new Claude session for this todo.</p>

        <FolderBrowser onPathChange={handlePathChange} />

        {isGitRepo && (
          <div className="mt-3 p-2 bg-gray-800/50 rounded border border-gray-700">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={useWorktree}
                onChange={e => setUseWorktree(e.target.checked)}
                className="rounded bg-gray-800 border-gray-600"
              />
              Create git worktree
            </label>
            {useWorktree && (
              <input
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="Branch name..."
                autoFocus
                className="mt-2 w-full text-sm bg-gray-800 text-gray-200 px-3 py-1.5 rounded border border-gray-600 outline-none focus:border-blue-500"
              />
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!currentPath || (useWorktree && !branchName.trim())}
            className="text-xs px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
