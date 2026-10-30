import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createSeedState } from './catalog.mjs';

// A small demo uses one versioned aggregate so related state changes commit together.
// Idempotency results live in a separate SQLite table and share that transaction.
export function openStore(dataDir) {
  const directory = resolve(dataDir);
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(join(directory, 'hrflow.sqlite'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      revision INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS idempotency (
      actor_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      request_key TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      result TEXT NOT NULL,
      PRIMARY KEY (actor_id, operation, request_key)
    );
  `);
  db.prepare('INSERT OR IGNORE INTO business_state (id, payload) VALUES (1, ?)')
    .run(JSON.stringify(createSeedState()));
  const getState = db.prepare('SELECT payload FROM business_state WHERE id = 1');
  const setState = db.prepare('UPDATE business_state SET payload = ?, revision = revision + 1 WHERE id = 1');
  const getOperation = db.prepare('SELECT payload_hash, result FROM idempotency WHERE actor_id = ? AND operation = ? AND request_key = ?');
  const putOperation = db.prepare('INSERT INTO idempotency (actor_id, operation, request_key, payload_hash, result) VALUES (?, ?, ?, ?, ?)');
  let closed = false;
  function read() { return JSON.parse(getState.get().payload); }
  function transaction(callback, request) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const hash = request && createHash('sha256').update(JSON.stringify(request.payload)).digest('hex');
      if (request) {
        const previous = getOperation.get(request.actorId, request.operation, request.key);
        if (previous) {
          if (previous.payload_hash !== hash) {
            const error = new Error('此操作编号已用于另一份内容，请重新确认后再提交。');
            error.status = 409;
            error.code = 'IDEMPOTENCY_CONFLICT';
            throw error;
          }
          db.exec('COMMIT');
          return JSON.parse(previous.result);
        }
      }
      const state = read();
      const result = callback(state);
      setState.run(JSON.stringify(state));
      if (request) putOperation.run(request.actorId, request.operation, request.key, hash, JSON.stringify(result));
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return {
    read, transaction,
    reset() {
      db.exec('BEGIN IMMEDIATE');
      try {
        setState.run(JSON.stringify(createSeedState()));
        db.exec('DELETE FROM idempotency');
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close() { if (!closed) { closed = true; db.close(); } },
  };
}
