import { TodoProvider } from './TodoProvider.js';
import { ExternalTodoItem, ProviderConfigField } from '../../types.js';
import { callMcpTool } from './mcpClient.js';

const configSchema: ProviderConfigField[] = [
  {
    key: 'doc_token',
    label: 'Document Token',
    type: 'string',
    required: true,
    placeholder: 'e.g. doxcnXyz123 (from the doc URL)',
  },
];

export const larkDocsProvider: TodoProvider = {
  id: 'lark-docs',
  displayName: 'Lark Docs',
  configSchema,

  async fetchItems(config: Record<string, unknown>): Promise<ExternalTodoItem[]> {
    const docToken = config.doc_token as string;

    const result = await callMcpTool('lark-docs', 'get_lark_doc_content', {
      doc_token: docToken,
    });

    const items: ExternalTodoItem[] = [];

    // Parse document content to find checklist items
    const content = result?.content?.[0]?.text || result?.text || '';
    const text = typeof content === 'string' ? content : JSON.stringify(content);

    // Parse checklist items from the document content
    // Lark docs may return structured blocks or markdown-like text
    const lines = text.split('\n');
    let itemIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Match markdown-style checkboxes: - [ ] or - [x]
      const checkboxMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.+)/);
      if (checkboxMatch) {
        const completed = checkboxMatch[1].toLowerCase() === 'x';
        const title = checkboxMatch[2].trim();
        items.push({
          externalId: `${docToken}_${itemIndex++}`,
          externalUrl: `https://bytedance.larkoffice.com/docx/${docToken}`,
          title,
          completed,
          priority: 'medium',
        });
        continue;
      }

      // Match TODO/DONE markers
      const todoMatch = trimmed.match(/^(?:TODO|TASK|ACTION):\s*(.+)/i);
      if (todoMatch) {
        items.push({
          externalId: `${docToken}_${itemIndex++}`,
          externalUrl: `https://bytedance.larkoffice.com/docx/${docToken}`,
          title: todoMatch[1].trim(),
          completed: false,
          priority: 'medium',
        });
        continue;
      }

      const doneMatch = trimmed.match(/^(?:DONE|COMPLETED|FINISHED):\s*(.+)/i);
      if (doneMatch) {
        items.push({
          externalId: `${docToken}_${itemIndex++}`,
          externalUrl: `https://bytedance.larkoffice.com/docx/${docToken}`,
          title: doneMatch[1].trim(),
          completed: true,
          priority: 'medium',
        });
      }
    }

    return items;
  },

  // completeItem not supported — Lark Docs is read-only for checklist parsing

  async validateConfig(config: Record<string, unknown>): Promise<string | null> {
    if (!config.doc_token) return 'doc_token is required';
    return null;
  },
};
