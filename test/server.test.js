const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { existsSync, unlinkSync } = require('node:fs');
const { once } = require('node:events');
const test = require('node:test');
const Database = require('better-sqlite3');

const databasePath = 'database.db';

test('initialise le serveur et la table users', async () => {
  if (existsSync(databasePath)) {
    unlinkSync(databasePath);
  }

  const server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    let startupTimeout;
    const [startupMessage] = await Promise.race([
      once(server.stdout, 'data'),
      new Promise((_, reject) => {
        startupTimeout = setTimeout(
          () => reject(new Error('Le serveur ne démarre pas.')),
          5_000,
        );
      }),
    ]).finally(() => clearTimeout(startupTimeout));

    const port = startupMessage.toString().match(/localhost:(\d+)/)?.[1];
    assert.ok(port, 'Le serveur doit annoncer son port d’écoute.');

    const response = await fetch(`http://localhost:${port}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.message, 'Le système de sécurité de la Batcave est opérationnel.');

    const database = new Database(databasePath, { readonly: true });
    const columns = database.prepare('PRAGMA table_info(users)').all();
    database.close();

    assert.deepEqual(
      columns.map(({ name, type, notnull, pk }) => ({ name, type, notnull, pk })),
      [
        { name: 'id', type: 'INTEGER', notnull: 0, pk: 1 },
        { name: 'username', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'password', type: 'TEXT', notnull: 1, pk: 0 },
      ],
    );
  } finally {
    if (server.exitCode === null) {
      const serverClosed = once(server, 'close');
      server.kill();
      await serverClosed;
    }

    if (existsSync(databasePath)) {
      unlinkSync(databasePath);
    }
  }
});
