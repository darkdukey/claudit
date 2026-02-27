import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConnection {
  process: ChildProcess;
  requestId: number;
  pending: Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>;
}

const connections = new Map<string, McpConnection>();

/**
 * Read MCP server configurations from Claude settings.
 */
function loadMcpConfig(): Record<string, McpServerConfig> {
  const configs: Record<string, McpServerConfig> = {};
  const settingsPath = path.join(process.env.HOME || '~', '.claude', 'settings.json');

  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.mcpServers) {
        Object.assign(configs, settings.mcpServers);
      }
    }
  } catch {
    // ignore
  }

  // Also check project-level .mcp.json
  const mcpJsonPath = path.join(process.cwd(), '.mcp.json');
  try {
    if (fs.existsSync(mcpJsonPath)) {
      const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
      if (mcpJson.mcpServers) {
        Object.assign(configs, mcpJson.mcpServers);
      }
    }
  } catch {
    // ignore
  }

  return configs;
}

/**
 * Connect to an MCP server via stdio JSON-RPC.
 */
function connectToServer(serverName: string): McpConnection {
  const existing = connections.get(serverName);
  if (existing && existing.process.exitCode === null) {
    return existing;
  }

  const configs = loadMcpConfig();
  const serverConfig = configs[serverName];
  if (!serverConfig) {
    throw new Error(`MCP server "${serverName}" not found in configuration`);
  }

  const proc = spawn(serverConfig.command, serverConfig.args || [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...serverConfig.env },
  });

  const conn: McpConnection = {
    process: proc,
    requestId: 0,
    pending: new Map(),
  };

  let buffer = '';
  proc.stdout!.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    // Handle JSON-RPC messages separated by Content-Length headers or newlines
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Content-Length')) continue;
      try {
        const msg = JSON.parse(trimmed);
        if (msg.id !== undefined && conn.pending.has(msg.id)) {
          const p = conn.pending.get(msg.id)!;
          conn.pending.delete(msg.id);
          if (msg.error) {
            p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            p.resolve(msg.result);
          }
        }
      } catch {
        // not a JSON line, skip
      }
    }
  });

  proc.on('exit', () => {
    // Reject all pending requests
    for (const [, p] of conn.pending) {
      p.reject(new Error(`MCP server "${serverName}" exited`));
    }
    conn.pending.clear();
    connections.delete(serverName);
  });

  // Initialize the server
  const initId = ++conn.requestId;
  const initMsg = JSON.stringify({
    jsonrpc: '2.0',
    id: initId,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'claudit', version: '1.0.0' },
    },
  });
  proc.stdin!.write(initMsg + '\n');

  connections.set(serverName, conn);
  return conn;
}

/**
 * Call an MCP tool on the specified server.
 */
export async function callMcpTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<any> {
  const conn = connectToServer(serverName);

  const id = ++conn.requestId;
  const request = JSON.stringify({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  });

  return new Promise((resolve, reject) => {
    conn.pending.set(id, { resolve, reject });
    conn.process.stdin!.write(request + '\n');

    // Timeout after 30 seconds
    setTimeout(() => {
      if (conn.pending.has(id)) {
        conn.pending.delete(id);
        reject(new Error(`MCP tool call "${toolName}" timed out`));
      }
    }, 30000);
  });
}

/**
 * Clean up all MCP connections on shutdown.
 */
export function closeMcpConnections() {
  for (const [, conn] of connections) {
    try {
      conn.process.kill();
    } catch {
      // ignore
    }
  }
  connections.clear();
}
