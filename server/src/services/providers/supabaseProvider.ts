import { TodoProvider } from './TodoProvider.js';
import { ExternalTodoItem, ProviderConfigField } from '../../types.js';

const configSchema: ProviderConfigField[] = [
  {
    key: 'supabase_url',
    label: 'Supabase Project URL',
    type: 'string',
    required: true,
    placeholder: 'e.g. https://xxx.supabase.co',
  },
  {
    key: 'anon_key',
    label: 'API Key (anon/publishable)',
    type: 'string',
    required: true,
    placeholder: 'eyJhbGciOiJIUzI1NiIs...',
    secret: true,
  },
  {
    key: 'table',
    label: 'Table Name',
    type: 'string',
    required: true,
    placeholder: 'e.g. bug_reports',
  },
  {
    key: 'title_column',
    label: 'Title Column',
    type: 'string',
    required: true,
    placeholder: 'e.g. message',
  },
  {
    key: 'status_column',
    label: 'Status Column',
    type: 'string',
    required: false,
    placeholder: 'e.g. status',
  },
  {
    key: 'done_value',
    label: 'Done Status Value',
    type: 'string',
    required: false,
    placeholder: 'e.g. done',
  },
  {
    key: 'description_columns',
    label: 'Description Columns (comma-separated)',
    type: 'string',
    required: false,
    placeholder: 'e.g. device_info,app_version,current_tab',
  },
  {
    key: 'filter',
    label: 'PostgREST Filter (optional)',
    type: 'string',
    required: false,
    placeholder: 'e.g. status=eq.open or assigned_to=eq.me',
  },
];

async function supabaseFetch(
  url: string,
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'PATCH' ? 'return=representation' : '',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase API error ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const supabaseProvider: TodoProvider = {
  id: 'supabase',
  displayName: 'Supabase',
  configSchema,

  async fetchItems(config: Record<string, unknown>): Promise<ExternalTodoItem[]> {
    const url = (config.supabase_url as string).replace(/\/$/, '');
    const apiKey = config.anon_key as string;
    const table = config.table as string;
    const titleCol = config.title_column as string;
    const statusCol = config.status_column as string | undefined;
    const doneValue = config.done_value as string | undefined;
    const descCols = config.description_columns as string | undefined;
    const filter = config.filter as string | undefined;

    // Build select columns
    const selectCols = new Set(['id', titleCol, 'created_at']);
    if (statusCol) selectCols.add(statusCol);
    if (descCols) {
      descCols.split(',').map(c => c.trim()).filter(Boolean).forEach(c => selectCols.add(c));
    }

    let path = `${table}?select=${Array.from(selectCols).join(',')}&order=created_at.desc`;
    if (filter) {
      path += `&${filter}`;
    }

    const rows = await supabaseFetch(url, apiKey, path);

    return (rows as Record<string, any>[]).map(row => {
      // Build description from extra columns
      let description: string | undefined;
      if (descCols) {
        const parts = descCols.split(',').map(c => c.trim()).filter(Boolean);
        const lines: string[] = [];
        for (const col of parts) {
          const val = row[col];
          if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) continue;
          if (Array.isArray(val)) {
            lines.push(`${col}: ${val.join(', ')}`);
          } else {
            lines.push(`${col}: ${val}`);
          }
        }
        if (lines.length > 0) description = lines.join('\n');
      }

      const completed = statusCol && doneValue
        ? String(row[statusCol]) === doneValue
        : false;

      return {
        externalId: String(row.id),
        externalUrl: `${url}/project/default/editor?table=${table}`,
        title: String(row[titleCol] || `Row ${row.id}`),
        description,
        completed,
        priority: mapStatusToPriority(statusCol ? row[statusCol] : undefined),
      };
    });
  },

  async completeItem(config: Record<string, unknown>, externalId: string): Promise<void> {
    const url = (config.supabase_url as string).replace(/\/$/, '');
    const apiKey = config.anon_key as string;
    const table = config.table as string;
    const statusCol = config.status_column as string | undefined;
    const doneValue = config.done_value as string | undefined;

    if (!statusCol || !doneValue) {
      throw new Error('Cannot complete: status_column and done_value not configured');
    }

    await supabaseFetch(url, apiKey, `${table}?id=eq.${externalId}`, {
      method: 'PATCH',
      body: JSON.stringify({ [statusCol]: doneValue }),
    });
  },

  async validateConfig(config: Record<string, unknown>): Promise<string | null> {
    if (!config.supabase_url) return 'supabase_url is required';
    if (!config.anon_key) return 'anon_key is required';
    if (!config.table) return 'table is required';
    if (!config.title_column) return 'title_column is required';
    return null;
  },
};

function mapStatusToPriority(status: string | undefined): 'low' | 'medium' | 'high' {
  if (!status) return 'medium';
  const lower = String(status).toLowerCase();
  if (lower === 'open') return 'high';
  if (lower === 'in_progress') return 'medium';
  return 'low';
}
