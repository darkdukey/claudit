import { useState, useEffect } from 'react';
import { TodoProviderConfig, ProviderTypeInfo, ProviderConfigField } from '../../types';
import {
  fetchProviderTypes,
  fetchProviderConfigs,
  createProviderConfig,
  updateProviderConfig,
  deleteProviderConfig,
  syncProvider,
} from '../../api/todoProviders';

interface Props {
  onClose: () => void;
}

export default function ProviderSettings({ onClose }: Props) {
  const [providerTypes, setProviderTypes] = useState<ProviderTypeInfo[]>([]);
  const [configs, setConfigs] = useState<TodoProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [types, cfgs] = await Promise.all([
        fetchProviderTypes(),
        fetchProviderConfigs(),
      ]);
      setProviderTypes(types);
      setConfigs(cfgs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(config: TodoProviderConfig) {
    try {
      const updated = await updateProviderConfig(config.id, { enabled: !config.enabled });
      setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this provider configuration?')) return;
    try {
      await deleteProviderConfig(id);
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      const result = await syncProvider(id);
      const msg = `Imported: ${result.imported}, Updated: ${result.updated}` +
        (result.errors.length > 0 ? `, Errors: ${result.errors.length}` : '');
      alert(msg);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(null);
    }
  }

  const providerTypeMap = new Map(providerTypes.map(t => [t.id, t]));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-200">Provider Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded p-3">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
            </div>
          )}

          {loading ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : (
            <>
              {/* Existing configs */}
              {configs.map(config => (
                <ConfigRow
                  key={config.id}
                  config={config}
                  providerType={providerTypeMap.get(config.providerId)}
                  isEditing={editingId === config.id}
                  isSyncing={syncing === config.id}
                  onToggle={() => handleToggle(config)}
                  onEdit={() => setEditingId(editingId === config.id ? null : config.id)}
                  onSave={async (updates) => {
                    try {
                      const updated = await updateProviderConfig(config.id, updates);
                      setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
                      setEditingId(null);
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }}
                  onDelete={() => handleDelete(config.id)}
                  onSync={() => handleSync(config.id)}
                />
              ))}

              {configs.length === 0 && !addingType && (
                <div className="text-gray-500 text-sm text-center py-6">
                  No providers configured. Add one below.
                </div>
              )}

              {/* Add new */}
              {addingType ? (
                <AddConfigForm
                  providerType={providerTypeMap.get(addingType)!}
                  onSave={async (data) => {
                    try {
                      const created = await createProviderConfig(data);
                      setConfigs(prev => [...prev, created]);
                      setAddingType(null);
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }}
                  onCancel={() => setAddingType(null)}
                />
              ) : (
                <div className="pt-2">
                  <label className="text-sm text-gray-400 block mb-1">Add Provider</label>
                  <div className="flex gap-2">
                    {providerTypes.map(pt => (
                      <button
                        key={pt.id}
                        onClick={() => setAddingType(pt.id)}
                        className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                      >
                        + {pt.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Sub-components --- */

function ConfigRow({
  config,
  providerType,
  isEditing,
  isSyncing,
  onToggle,
  onEdit,
  onSave,
  onDelete,
  onSync,
}: {
  config: TodoProviderConfig;
  providerType?: ProviderTypeInfo;
  isEditing: boolean;
  isSyncing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<TodoProviderConfig>) => void;
  onDelete: () => void;
  onSync: () => void;
}) {
  const [editName, setEditName] = useState(config.name);
  const [editInterval, setEditInterval] = useState(config.syncIntervalMinutes ?? 0);
  const [editConfig, setEditConfig] = useState<Record<string, unknown>>(config.config);

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Enable toggle */}
          <button
            onClick={onToggle}
            className={`w-8 h-4 rounded-full relative transition-colors ${
              config.enabled ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              config.enabled ? 'left-4' : 'left-0.5'
            }`} />
          </button>
          <span className="text-sm text-gray-200 font-medium">{config.name}</span>
          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">
            {providerType?.displayName || config.providerId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {config.lastSyncAt && (
            <span className="text-xs text-gray-500">
              Synced {new Date(config.lastSyncAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={onEdit} className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={onDelete} className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded hover:bg-red-900/70">
            Delete
          </button>
        </div>
      </div>

      {config.lastSyncError && (
        <div className="text-xs text-red-400 bg-red-900/20 rounded px-2 py-1">
          {config.lastSyncError}
        </div>
      )}

      {isEditing && providerType && (
        <div className="border-t border-gray-700 pt-3 mt-2 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200"
            />
          </div>
          <ConfigFields
            schema={providerType.configSchema}
            values={editConfig}
            onChange={setEditConfig}
          />
          <div>
            <label className="text-xs text-gray-400 block mb-1">Auto-sync interval (minutes, 0 = manual only)</label>
            <input
              type="number"
              min={0}
              value={editInterval}
              onChange={e => setEditInterval(Number(e.target.value))}
              className="w-32 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200"
            />
          </div>
          <button
            onClick={() => onSave({ name: editName, config: editConfig, syncIntervalMinutes: editInterval })}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function AddConfigForm({
  providerType,
  onSave,
  onCancel,
}: {
  providerType: ProviderTypeInfo;
  onSave: (data: {
    providerId: string;
    name: string;
    config: Record<string, unknown>;
    syncIntervalMinutes?: number;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [syncInterval, setSyncInterval] = useState(0);

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-blue-800">
      <h3 className="text-sm font-semibold text-gray-200">Add {providerType.displayName} Provider</h3>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={`e.g. My ${providerType.displayName}`}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200"
        />
      </div>
      <ConfigFields
        schema={providerType.configSchema}
        values={config}
        onChange={setConfig}
      />
      <div>
        <label className="text-xs text-gray-400 block mb-1">Auto-sync interval (minutes, 0 = manual only)</label>
        <input
          type="number"
          min={0}
          value={syncInterval}
          onChange={e => setSyncInterval(Number(e.target.value))}
          className="w-32 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ providerId: providerType.id, name, config, syncIntervalMinutes: syncInterval })}
          disabled={!name}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
        >
          Create
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ConfigFields({
  schema,
  values,
  onChange,
}: {
  schema: ProviderConfigField[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}) {
  function setValue(key: string, value: unknown) {
    onChange({ ...values, [key]: value });
  }

  return (
    <>
      {schema.map(field => (
        <div key={field.key}>
          <label className="text-xs text-gray-400 block mb-1">
            {field.label}{field.required && <span className="text-red-400"> *</span>}
          </label>
          {field.type === 'select' && field.options ? (
            <select
              value={String(values[field.key] ?? '')}
              onChange={e => setValue(field.key, e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200"
            >
              <option value="">Select...</option>
              {field.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.type === 'boolean' ? (
            <input
              type="checkbox"
              checked={Boolean(values[field.key])}
              onChange={e => setValue(field.key, e.target.checked)}
              className="rounded"
            />
          ) : field.type === 'number' ? (
            <input
              type="number"
              value={Number(values[field.key] ?? 0)}
              onChange={e => setValue(field.key, Number(e.target.value))}
              placeholder={field.placeholder}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200"
            />
          ) : (
            <input
              type={field.secret ? 'password' : 'text'}
              value={String(values[field.key] ?? '')}
              onChange={e => setValue(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200"
            />
          )}
        </div>
      ))}
    </>
  );
}
