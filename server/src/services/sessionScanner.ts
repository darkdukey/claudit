import fs from 'fs';
import path from 'path';
import os from 'os';
import { HistoryEntry, SessionSummary } from '../types.js';
import { getManagedSessionMap } from './managedSessions.js';
import { getSessionCache, setSessionCache, isSessionStale, CachedSessionData } from './sessionIndexCache.js';

export const CLAUDE_DIR = path.join(os.homedir(), '.claude');
export const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
export const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');

/** Build history index from history.jsonl, also builds projectHash -> real path map */
export function readHistoryEntries(): {
  entries: Map<string, HistoryEntry>;
  projectPaths: Map<string, string>;
} {
  const entries = new Map<string, HistoryEntry>();
  const projectPaths = new Map<string, string>();
  if (!fs.existsSync(HISTORY_FILE)) return { entries, projectPaths };

  const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry: HistoryEntry = JSON.parse(line);
      const existing = entries.get(entry.sessionId);
      if (!existing || entry.timestamp > existing.timestamp) {
        entries.set(entry.sessionId, entry);
      }
      if (entry.project) {
        const hash = entry.project.replace(/\//g, '-');
        projectPaths.set(hash, entry.project);
      }
    } catch {
      // skip malformed lines
    }
  }
  return { entries, projectPaths };
}

/** Try to get project path (cwd) from session JSONL file */
export function getProjectPathFromSession(sessionFile: string): string | null {
  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    for (const line of content.split('\n').slice(0, 10)) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (record.cwd) return record.cwd;
      } catch {
        // skip malformed
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Try to extract the first user message from a session JSONL file */
export function getFirstUserMessage(sessionFile: string): string | null {
  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (record.type !== 'user') continue;
        const msg = record.message;
        if (!msg?.content) continue;
        if (typeof msg.content === 'string') return msg.content;
        if (Array.isArray(msg.content)) {
          const hasNonToolResult = msg.content.some(
            (b: any) => b.type === 'text' || (b.type !== 'tool_result')
          );
          if (!hasNonToolResult) continue;
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) return block.text;
          }
        }
      } catch {
        // skip malformed lines
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Quick-count user and assistant type lines in a session file */
export function countMessages(sessionFile: string): number {
  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    let count = 0;
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      if (line.includes('"type":"user"') || line.includes('"type":"assistant"')) {
        try {
          const record = JSON.parse(line);
          if (record.type === 'user' || record.type === 'assistant') {
            count++;
          }
        } catch {
          // skip malformed
        }
      }
    }
    return count;
  } catch {
    return 0;
  }
}

/** Read from end of file to find last user/assistant record type */
export function getLastSignificantRecordType(sessionFile: string): 'user' | 'assistant' | null {
  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    const lines = content.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const record = JSON.parse(line);
        if (record.type === 'user' || record.type === 'assistant') {
          return record.type;
        }
      } catch {
        // skip malformed
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Scan projects directory to find all session files, using mtime-based cache */
export function scanProjectSessions(): SessionSummary[] {
  const summaries: SessionSummary[] = [];
  if (!fs.existsSync(PROJECTS_DIR)) return summaries;

  const { entries: historyEntries, projectPaths } = readHistoryEntries();
  const managedMap = getManagedSessionMap();
  const projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });

  const indexCache = getSessionCache();
  const updatedCache: Record<string, CachedSessionData> = { ...indexCache };
  let cacheModified = false;

  for (const dir of projectDirs) {
    if (!dir.isDirectory()) continue;
    const projectHash = dir.name;
    const projectDir = path.join(PROJECTS_DIR, projectHash);

    const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
    let projectPath = projectPaths.get(projectHash) || '';

    for (const file of files) {
      const sessionId = file.replace('.jsonl', '');
      const historyEntry = historyEntries.get(sessionId);
      const filePath = path.join(projectDir, file);

      if (!projectPath && historyEntry?.project) {
        projectPath = historyEntry.project;
      }
      if (!projectPath) {
        projectPath = getProjectPathFromSession(filePath) || projectHash;
      }

      let lastMessage: string;
      let timestamp: number;
      let messageCount: number;
      let lastRecordType: 'user' | 'assistant' | null;

      if (!isSessionStale(sessionId, filePath, indexCache)) {
        // Use cached data
        const cached = indexCache[sessionId];
        lastMessage = cached.lastMessage;
        timestamp = cached.timestamp;
        messageCount = cached.messageCount;
        lastRecordType = cached.lastRecordType;
        // Update projectPath from cache if not yet resolved
        if (!projectPath || projectPath === projectHash) {
          projectPath = cached.projectPath;
        }
      } else {
        // Full scan
        if (historyEntry) {
          timestamp = historyEntry.timestamp;
          lastMessage = historyEntry.display;
        } else {
          const stat = fs.statSync(filePath);
          timestamp = stat.mtimeMs;
          lastMessage = getFirstUserMessage(filePath) || sessionId.slice(0, 8) + '...';
        }

        if (lastMessage.length > 100) {
          lastMessage = lastMessage.slice(0, 100) + '...';
        }

        messageCount = countMessages(filePath);
        lastRecordType = messageCount > 0 ? getLastSignificantRecordType(filePath) : null;

        // Update cache
        try {
          const stat = fs.statSync(filePath);
          updatedCache[sessionId] = {
            projectHash,
            projectPath,
            lastMessage,
            timestamp,
            messageCount,
            lastRecordType,
            fileMtime: stat.mtimeMs,
          };
          cacheModified = true;
        } catch {
          // ignore stat error
        }
      }

      let status: 'idle' | 'need_attention' = 'idle';
      if (messageCount > 0 && lastRecordType === 'assistant') {
        status = 'need_attention';
      }

      const managed = managedMap.get(sessionId);

      summaries.push({
        sessionId,
        projectPath,
        projectHash,
        lastMessage,
        timestamp,
        messageCount,
        displayName: managed?.displayName,
        status,
      });
    }
  }

  if (cacheModified) {
    setSessionCache(updatedCache);
  }

  return summaries;
}
