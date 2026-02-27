import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Generic JSON file store with atomic writes (temp file + rename).
 */
export class JsonStore<T> {
  private filePath: string;
  private fallback: T;

  constructor(filePath: string, fallback: T) {
    this.filePath = filePath;
    this.fallback = fallback;
  }

  read(): T {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch {
      // corrupt file — return fallback
    }
    return this.fallback;
  }

  write(data: T): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = path.join(dir, `.tmp-${crypto.randomUUID()}`);
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, this.filePath);
  }

  /** Read, apply mutation, write back atomically. Returns the mutator's return value. */
  update<R>(fn: (data: T) => R): R {
    const data = this.read();
    const result = fn(data);
    this.write(data);
    return result;
  }
}
