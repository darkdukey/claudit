import { useEffect } from 'react';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import SearchBar from './SearchBar';
import ProjectGroup from './ProjectGroup';
import NewSessionModal from '../NewSessionModal';

export default function SessionList() {
  const {
    groups,
    archivedGroups,
    archivedCount,
    query,
    managedOnly,
    loading,
    error,
    expandedSet,
    creating,
    archivedExpanded,
    fetchSessions,
    fetchArchived,
    createSession,
    toggleAllGroups,
    setQuery,
    setManagedOnly,
    setArchivedExpanded,
  } = useSessionStore();

  const showNewModal = useUIStore(s => s.showNewModal);
  const setShowNewModal = useUIStore(s => s.setShowNewModal);
  const selectSession = useUIStore(s => s.selectSession);

  // Initial load
  useEffect(() => {
    fetchSessions();
    fetchArchived();
  }, [fetchSessions, fetchArchived]);

  // Debounced query search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions(query || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchSessions, managedOnly]);

  const handleCreateSession = async (projectPath: string, worktree?: { branchName: string }) => {
    setShowNewModal(false);
    const result = await createSession(projectPath, { worktree });
    if (result) {
      selectSession(result.projectHash, result.sessionId, result.projectPath);
    }
  };

  const allExpanded = groups.length > 0 && groups.every(g => expandedSet.has(g.projectHash));

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-semibold text-gray-200">Claude Sessions</h1>
            <button
              onClick={toggleAllGroups}
              title={allExpanded ? 'Collapse all' : 'Expand all'}
              className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
            >
              <span className={`inline-block text-xs transition-transform ${allExpanded ? 'rotate-90' : ''}`}>▶</span>
            </button>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            disabled={creating}
            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
          >
            {creating ? '...' : '+ New'}
          </button>
        </div>
        {/* Toggle pill */}
        <div className="flex rounded-md overflow-hidden border border-gray-700 text-xs">
          <button
            onClick={() => setManagedOnly(false)}
            className={`flex-1 px-3 py-1 transition-colors ${
              !managedOnly ? 'bg-gray-700 text-gray-200' : 'bg-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setManagedOnly(true)}
            className={`flex-1 px-3 py-1 transition-colors ${
              managedOnly ? 'bg-gray-700 text-gray-200' : 'bg-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Manager
          </button>
        </div>
      </div>
      <SearchBar value={query} onChange={setQuery} />
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-sm text-gray-500">Loading sessions...</div>
        )}
        {error && (
          <div className="p-4 text-sm text-red-400">{error}</div>
        )}
        {!loading && !error && groups.length === 0 && archivedCount === 0 && (
          <div className="p-4 text-sm text-gray-500">No sessions found</div>
        )}
        {groups.map(g => (
          <ProjectGroup
            key={g.projectHash}
            group={g}
          />
        ))}

        {/* Archived section */}
        {archivedCount > 0 && (
          <div className="border-t border-gray-800 mt-2">
            <button
              onClick={() => setArchivedExpanded(!archivedExpanded)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800
                         text-xs font-medium text-gray-500 border-b border-gray-800"
            >
              <span className={`transition-transform ${archivedExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span>Archived ({archivedCount})</span>
            </button>
            {archivedExpanded && archivedGroups.map(g => (
              <ProjectGroup
                key={`archived-${g.projectHash}`}
                group={g}
                isArchived
              />
            ))}
          </div>
        )}
      </div>

      {/* New Session Modal */}
      {showNewModal && (
        <NewSessionModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateSession}
        />
      )}
    </div>
  );
}
