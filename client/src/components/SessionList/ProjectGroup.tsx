import { ProjectGroup as ProjectGroupType } from '../../types';
import { useSessionStore } from '../../stores/useSessionStore';
import SessionItem from './SessionItem';

interface Props {
  group: ProjectGroupType;
  isArchived?: boolean;
}

function shortProjectName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.slice(-2).join('/');
}

export default function ProjectGroup({ group, isArchived }: Props) {
  const expandedSet = useSessionStore(s => s.expandedSet);
  const archivedGroupExpanded = useSessionStore(s => s.archivedGroupExpanded);
  const toggleGroup = useSessionStore(s => s.toggleGroup);
  const toggleArchivedGroup = useSessionStore(s => s.toggleArchivedGroup);

  const expanded = isArchived
    ? archivedGroupExpanded.has(group.projectHash)
    : expandedSet.has(group.projectHash);

  const handleToggle = () => {
    if (isArchived) {
      toggleArchivedGroup(group.projectHash);
    } else {
      toggleGroup(group.projectHash);
    }
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-850 hover:bg-gray-800
                   text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-800"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <span className="truncate">{shortProjectName(group.projectPath)}</span>
        <span className="ml-auto text-gray-600">{group.sessions.length}</span>
      </button>
      {expanded && (
        <div>
          {group.sessions.map(s => (
            <SessionItem
              key={s.sessionId}
              session={s}
              projectHash={group.projectHash}
              isArchived={isArchived}
            />
          ))}
        </div>
      )}
    </div>
  );
}
