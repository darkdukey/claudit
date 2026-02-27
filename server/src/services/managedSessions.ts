import path from 'path';
import os from 'os';
import { JsonStore } from './jsonStore.js';

const STORE_FILE = path.join(os.homedir(), '.claude', 'claudit-sessions.json');

export interface ManagedSession {
  sessionId: string;
  projectPath: string;
  displayName?: string;
  archived?: boolean;
  pinned?: boolean;
  createdAt: string;
}

interface Store {
  sessions: ManagedSession[];
}

const store = new JsonStore<Store>(STORE_FILE, { sessions: [] });

export function getManagedSessions(): ManagedSession[] {
  return store.read().sessions;
}

export function addManagedSession(sessionId: string, projectPath: string): ManagedSession {
  const entry: ManagedSession = {
    sessionId,
    projectPath,
    createdAt: new Date().toISOString(),
  };
  store.update(data => { data.sessions.push(entry); });
  return entry;
}

export function renameManagedSession(sessionId: string, name: string): ManagedSession | null {
  let result: ManagedSession | null = null;
  store.update(data => {
    const entry = data.sessions.find(s => s.sessionId === sessionId);
    if (entry) {
      entry.displayName = name;
      result = entry;
    }
  });
  return result;
}

export function archiveManagedSession(sessionId: string, archived: boolean): void {
  store.update(data => {
    let entry = data.sessions.find(s => s.sessionId === sessionId);
    if (!entry) {
      entry = { sessionId, projectPath: '', createdAt: new Date().toISOString() };
      data.sessions.push(entry);
    }
    entry.archived = archived;
  });
}

export function removeManagedSession(sessionId: string): void {
  store.update(data => {
    data.sessions = data.sessions.filter(s => s.sessionId !== sessionId);
  });
}

export function pinManagedSession(sessionId: string, pinned: boolean): void {
  store.update(data => {
    let entry = data.sessions.find(s => s.sessionId === sessionId);
    if (!entry) {
      entry = { sessionId, projectPath: '', createdAt: new Date().toISOString() };
      data.sessions.push(entry);
    }
    entry.pinned = pinned;
  });
}

export function getPinnedSessionIds(): Set<string> {
  const data = store.read();
  const set = new Set<string>();
  for (const s of data.sessions) {
    if (s.pinned) set.add(s.sessionId);
  }
  return set;
}

export function getArchivedSessionIds(): Set<string> {
  const data = store.read();
  const set = new Set<string>();
  for (const s of data.sessions) {
    if (s.archived) set.add(s.sessionId);
  }
  return set;
}

/** Returns Map<sessionId, ManagedSession> for fast lookup */
export function getManagedSessionMap(): Map<string, ManagedSession> {
  const map = new Map<string, ManagedSession>();
  for (const s of getManagedSessions()) {
    map.set(s.sessionId, s);
  }
  return map;
}
