import { TodoProvider } from './TodoProvider.js';
import { meegoProvider } from './meegoProvider.js';
import { larkDocsProvider } from './larkDocsProvider.js';
import { supabaseProvider } from './supabaseProvider.js';

const providers = new Map<string, TodoProvider>();

function register(p: TodoProvider) {
  providers.set(p.id, p);
}

// Register built-in providers
register(meegoProvider);
register(larkDocsProvider);
register(supabaseProvider);

export function getProvider(id: string): TodoProvider | undefined {
  return providers.get(id);
}

export function getAllProviders(): TodoProvider[] {
  return Array.from(providers.values());
}
