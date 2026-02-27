import { useState, useEffect } from 'react';
import { SessionDetail as SessionDetailType } from '../../types';
import { fetchSessionDetail } from '../../api/sessions';
import EmptyState from './EmptyState';
import TerminalView from './TerminalView';

interface Props {
  projectHash: string;
  sessionId: string;
  projectPath: string;
  isNew?: boolean;
}

export default function SessionDetail({ projectHash, sessionId, projectPath, isNew }: Props) {
  const [detail, setDetail] = useState<SessionDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session header info when selection changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSessionDetail(projectHash, sessionId)
      .then(data => {
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [projectHash, sessionId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Loading session...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  if (!detail) return <EmptyState />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3 bg-gray-900 flex items-center justify-between shrink-0">
        <div>
          <div className="text-sm font-medium text-gray-200 truncate">
            {detail.projectPath.split('/').pop() || detail.sessionId}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {detail.sessionId}
          </div>
        </div>
      </div>

      {/* Terminal */}
      <TerminalView sessionId={sessionId} projectPath={projectPath} isNew={isNew} />
    </div>
  );
}
