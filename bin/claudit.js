#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env.CLAUDIT_ROOT = join(__dirname, '..');

await import('../server/dist/server/src/index.js');
