import { useState, useEffect, useCallback } from 'react';
import { TodoItem as TodoItemType, SessionSummary } from '../../types';
import { fetchTodos, createTodo, updateTodo } from '../../api/todo';
import { syncAllProviders } from '../../api/todoProviders';
import { fetchSessions } from '../../api/sessions';
import { useUIStore } from '../../stores/useUIStore';
import TodoItem from './TodoItem';
import TodoForm from './TodoForm';
import NewSessionModal from '../NewSessionModal';
import ProviderSettings from './ProviderSettings';

type Filter = 'all' | 'active' | 'done';

interface Props {
  selectedTodoId: string | null;
  onSelect: (id: string) => void;
}

export default function TodoList({ selectedTodoId, onSelect }: Props) {
  const [todos, setTodos] = useState<TodoItemType[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showProviderSettings, setShowProviderSettings] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const todoSessionPrefill = useUIStore(s => s.todoSessionPrefill);
  const setTodoSessionPrefill = useUIStore(s => s.setTodoSessionPrefill);

  const loadTodos = useCallback(async () => {
    try {
      const data = await fetchTodos();
      setTodos(data);
    } catch (err) {
      console.error('Failed to load todos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const groups = await fetchSessions(undefined, true);
      const allSessions = groups.flatMap(g => g.sessions);
      setSessions(allSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, []);

  useEffect(() => {
    loadTodos();
    loadSessions();
    const interval = setInterval(loadTodos, 10000);
    return () => clearInterval(interval);
  }, [loadTodos, loadSessions]);

  // Watch for session→todo prefill
  useEffect(() => {
    if (todoSessionPrefill) {
      setShowForm(true);
    }
  }, [todoSessionPrefill]);

  const handleCreate = async (data: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    sessionId?: string;
    sessionLabel?: string;
  }) => {
    try {
      const todo = await createTodo(data);
      setTodos(prev => [...prev, todo]);
      setShowForm(false);
      setTodoSessionPrefill(null);
      onSelect(todo.id);
    } catch (err) {
      console.error('Failed to create todo:', err);
    }
  };

  const handleToggle = async (todo: TodoItemType) => {
    try {
      const updated = await updateTodo(todo.id, {
        completed: !todo.completed,
        completedAt: !todo.completed ? new Date().toISOString() : undefined,
      });
      setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const results = await syncAllProviders();
      const total = results.reduce((a, r) => ({ imported: a.imported + r.imported, updated: a.updated + r.updated }), { imported: 0, updated: 0 });
      if (total.imported > 0 || total.updated > 0) {
        await loadTodos();
      }
    } catch (err) {
      console.error('Failed to sync providers:', err);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setTodoSessionPrefill(null);
  };

  const handleNewSessionCreated = async (projectPath: string) => {
    setShowNewSessionModal(false);
    // Reload sessions after creation so the new one appears in dropdown
    await loadSessions();
  };

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const activeCount = todos.filter(t => !t.completed).length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Todos</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            title="Sync all providers"
            className="text-xs px-2 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {syncingAll ? '...' : '↻'}
          </button>
          <button
            onClick={() => setShowProviderSettings(true)}
            title="Provider settings"
            className="text-xs px-2 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            ⚙
          </button>
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) setTodoSessionPrefill(null); }}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            {showForm ? 'Cancel' : '+ New'}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 py-2 border-b border-gray-800 flex gap-1">
        {(['all', 'active', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full capitalize transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {f}{f === 'active' ? ` (${activeCount})` : ''}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="p-4 border-b border-gray-800 bg-gray-900/50">
          <TodoForm
            sessions={sessions}
            prefillSessionId={todoSessionPrefill?.sessionId}
            onSubmit={handleCreate}
            onCancel={handleCancelForm}
            onCreateSession={() => setShowNewSessionModal(true)}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-500 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm text-center">
            {filter === 'all'
              ? 'No todos yet. Create one to get started.'
              : filter === 'active'
              ? 'No active todos.'
              : 'No completed todos.'}
          </div>
        ) : (
          filtered.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              selected={todo.id === selectedTodoId}
              onSelect={() => onSelect(todo.id)}
              onToggle={() => handleToggle(todo)}
            />
          ))
        )}
      </div>

      {showNewSessionModal && (
        <NewSessionModal
          onClose={() => setShowNewSessionModal(false)}
          onCreate={handleNewSessionCreated}
        />
      )}

      {showProviderSettings && (
        <ProviderSettings onClose={() => { setShowProviderSettings(false); loadTodos(); }} />
      )}
    </div>
  );
}
