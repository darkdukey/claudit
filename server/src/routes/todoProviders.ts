import { Router } from 'express';
import { getAllProviders, getProvider } from '../services/providers/registry.js';
import {
  getAllConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
} from '../services/providerConfigStorage.js';
import { syncProvider, syncAllProviders } from '../services/todoSyncEngine.js';

const router = Router();

// GET /api/todo/providers — list provider types
router.get('/', (_req, res) => {
  try {
    const providers = getAllProviders().map(p => ({
      id: p.id,
      displayName: p.displayName,
      configSchema: p.configSchema,
    }));
    res.json(providers);
  } catch (err) {
    console.error('Error listing providers:', err);
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

/**
 * Redact secret fields from a config object.
 */
function redactSecrets(providerId: string, config: Record<string, unknown>): Record<string, unknown> {
  const provider = getProvider(providerId);
  if (!provider) return config;

  const secretKeys = new Set(
    provider.configSchema.filter(f => f.secret).map(f => f.key)
  );

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    redacted[key] = secretKeys.has(key) && typeof value === 'string' && value
      ? '••••••••'
      : value;
  }
  return redacted;
}

// GET /api/todo/providers/configs — list all configs (secrets redacted)
router.get('/configs', (_req, res) => {
  try {
    const configs = getAllConfigs().map(c => ({
      ...c,
      config: redactSecrets(c.providerId, c.config),
    }));
    res.json(configs);
  } catch (err) {
    console.error('Error listing configs:', err);
    res.status(500).json({ error: 'Failed to list configs' });
  }
});

// POST /api/todo/providers/configs — create config
router.post('/configs', async (req, res) => {
  try {
    const { providerId, name, enabled, config: providerConfig, syncIntervalMinutes } = req.body;
    if (!providerId || !name) {
      res.status(400).json({ error: 'providerId and name are required' });
      return;
    }

    const provider = getProvider(providerId);
    if (!provider) {
      res.status(400).json({ error: `Unknown provider: ${providerId}` });
      return;
    }

    // Validate config if provider supports it
    if (provider.validateConfig) {
      const validationError = await provider.validateConfig(providerConfig || {});
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }
    }

    const created = createConfig({
      providerId,
      name,
      enabled: enabled ?? true,
      config: providerConfig || {},
      syncIntervalMinutes: syncIntervalMinutes ?? 0,
    });

    res.status(201).json({
      ...created,
      config: redactSecrets(created.providerId, created.config),
    });
  } catch (err) {
    console.error('Error creating config:', err);
    res.status(500).json({ error: 'Failed to create config' });
  }
});

// PUT /api/todo/providers/configs/:id — update config
router.put('/configs/:id', async (req, res) => {
  try {
    const existing = getConfig(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    // If config fields are being updated, merge with existing (don't overwrite secrets with redacted values)
    let newConfig = req.body.config;
    if (newConfig) {
      const provider = getProvider(existing.providerId);
      if (provider) {
        const secretKeys = new Set(
          provider.configSchema.filter(f => f.secret).map(f => f.key)
        );
        const merged: Record<string, unknown> = { ...existing.config };
        for (const [key, value] of Object.entries(newConfig)) {
          // Skip redacted placeholder values for secret fields
          if (secretKeys.has(key) && value === '••••••••') continue;
          merged[key] = value;
        }
        newConfig = merged;
      }
    }

    const updates: Record<string, unknown> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.enabled !== undefined) updates.enabled = req.body.enabled;
    if (newConfig !== undefined) updates.config = newConfig;
    if (req.body.syncIntervalMinutes !== undefined) updates.syncIntervalMinutes = req.body.syncIntervalMinutes;

    const updated = updateConfig(req.params.id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    res.json({
      ...updated,
      config: redactSecrets(updated.providerId, updated.config),
    });
  } catch (err) {
    console.error('Error updating config:', err);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// DELETE /api/todo/providers/configs/:id — delete config
router.delete('/configs/:id', (req, res) => {
  try {
    const ok = deleteConfig(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting config:', err);
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

// POST /api/todo/providers/configs/:id/sync — manual sync one config
router.post('/configs/:id/sync', async (req, res) => {
  try {
    const config = getConfig(req.params.id);
    if (!config) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const result = await syncProvider(config);
    res.json(result);
  } catch (err) {
    console.error('Error syncing provider:', err);
    res.status(500).json({ error: 'Failed to sync provider' });
  }
});

// POST /api/todo/providers/sync-all — manual sync all enabled configs
router.post('/sync-all', async (_req, res) => {
  try {
    const results = await syncAllProviders();
    res.json(results);
  } catch (err) {
    console.error('Error syncing all providers:', err);
    res.status(500).json({ error: 'Failed to sync providers' });
  }
});

export default router;
