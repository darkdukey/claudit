import { TodoProvider } from './TodoProvider.js';
import { ExternalTodoItem, ProviderConfigField } from '../../types.js';
import { callMcpTool } from './mcpClient.js';

const configSchema: ProviderConfigField[] = [
  {
    key: 'project_key',
    label: 'Project Key',
    type: 'string',
    required: true,
    placeholder: 'e.g. my-project',
  },
  {
    key: 'work_item_type',
    label: 'Work Item Type',
    type: 'string',
    required: true,
    placeholder: 'e.g. story, task, bug',
  },
  {
    key: 'moql_filter',
    label: 'MOQL Filter (optional)',
    type: 'string',
    required: false,
    placeholder: 'e.g. assignee = "me" AND status != "done"',
  },
];

export const meegoProvider: TodoProvider = {
  id: 'meego',
  displayName: 'Meego',
  configSchema,

  async fetchItems(config: Record<string, unknown>): Promise<ExternalTodoItem[]> {
    const projectKey = config.project_key as string;
    const workItemType = config.work_item_type as string;
    const moqlFilter = config.moql_filter as string | undefined;

    let mql = `project_key = "${projectKey}" AND work_item_type_key = "${workItemType}"`;
    if (moqlFilter) {
      mql += ` AND (${moqlFilter})`;
    }

    const result = await callMcpTool('meego', 'search_by_mql', {
      project_key: projectKey,
      work_item_type_key: workItemType,
      mql,
    });

    const items: ExternalTodoItem[] = [];

    // Parse the MCP result — expected to contain work items
    const workItems = result?.content?.[0]?.text
      ? JSON.parse(result.content[0].text)
      : result?.work_items || result || [];

    const list = Array.isArray(workItems) ? workItems : workItems.work_items || [];

    for (const item of list) {
      items.push({
        externalId: String(item.id || item.work_item_id),
        externalUrl: item.url || item.web_url,
        title: item.name || item.title || item.summary || `Work Item ${item.id}`,
        description: item.description,
        completed: isCompletedStatus(item.status?.name || item.status_name || item.status),
        priority: mapPriority(item.priority?.name || item.priority_name || item.priority),
      });
    }

    return items;
  },

  async completeItem(config: Record<string, unknown>, externalId: string): Promise<void> {
    const projectKey = config.project_key as string;
    const workItemType = config.work_item_type as string;

    await callMcpTool('meego', 'finish_node', {
      project_key: projectKey,
      work_item_type_key: workItemType,
      work_item_id: Number(externalId),
    });
  },

  async validateConfig(config: Record<string, unknown>): Promise<string | null> {
    if (!config.project_key) return 'project_key is required';
    if (!config.work_item_type) return 'work_item_type is required';
    return null;
  },
};

function isCompletedStatus(status: string | undefined): boolean {
  if (!status) return false;
  const lower = status.toLowerCase();
  return lower === 'done' || lower === 'closed' || lower === 'completed' || lower === 'resolved';
}

function mapPriority(priority: string | number | undefined): 'low' | 'medium' | 'high' {
  if (!priority) return 'medium';
  if (typeof priority === 'number') {
    if (priority >= 3) return 'high';
    if (priority >= 2) return 'medium';
    return 'low';
  }
  const lower = priority.toLowerCase();
  if (lower.includes('high') || lower.includes('urgent') || lower.includes('critical')) return 'high';
  if (lower.includes('low') || lower.includes('minor')) return 'low';
  return 'medium';
}
