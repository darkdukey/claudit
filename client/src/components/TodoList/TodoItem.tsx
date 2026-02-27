import { TodoItem as TodoItemType } from '../../types';

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const providerColors: Record<string, string> = {
  meego: 'bg-blue-900/50 text-blue-400',
  'lark-docs': 'bg-green-900/50 text-green-400',
  supabase: 'bg-emerald-900/50 text-emerald-400',
};

const syncStatusDot: Record<string, string> = {
  synced: 'bg-green-500',
  local_modified: 'bg-yellow-500',
  sync_error: 'bg-red-500',
};

interface Props {
  todo: TodoItemType;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

export default function TodoItem({ todo, selected, onSelect, onToggle }: Props) {
  const timeAgo = getTimeAgo(todo.createdAt);

  return (
    <div
      onClick={onSelect}
      className={`px-4 py-3 border-b border-gray-800 cursor-pointer transition-colors flex items-start gap-3 ${
        selected ? 'bg-gray-800' : 'hover:bg-gray-800/50'
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          todo.completed
            ? 'bg-blue-600 border-blue-600'
            : 'border-gray-500 hover:border-gray-300'
        }`}
      >
        {todo.completed && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[todo.priority]}`} />
          <span className={`text-sm truncate ${
            todo.completed ? 'text-gray-500 line-through' : 'text-gray-200'
          }`}>
            {todo.title}
          </span>
          {todo.provider && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1 ${
              providerColors[todo.provider.providerId] || 'bg-gray-700 text-gray-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatusDot[todo.provider.syncStatus] || 'bg-gray-500'}`} />
              {todo.provider.providerId}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 ml-4">{timeAgo}</div>
      </div>
    </div>
  );
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
