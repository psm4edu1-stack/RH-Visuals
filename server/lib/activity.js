import { randomUUID } from 'node:crypto'
import { db, timestamps } from '../db/database.js'

/**
 * Persist an administrative audit entry. Never pass passwords, tokens,
 * API keys or full customer briefs into `description`.
 */
export function logActivity(req, { action, entityType, entityId = '', description = '' }) {
  try {
    db.prepare(`
      INSERT INTO activity_log
        (id, admin_id, admin_name, action, entity_type, entity_id, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      req.admin?.id ? String(req.admin.id) : '',
      req.admin?.name ?? '',
      action,
      entityType,
      String(entityId),
      description.slice(0, 500),
      timestamps.now(),
    )
  } catch (error) {
    // A failed audit write must not roll back an already committed business
    // operation, but it must be visible in server logs for investigation.
    console.error('[activity] Could not record activity:', error.message)
  }
}
