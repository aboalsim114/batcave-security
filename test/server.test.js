const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { existsSync, unlinkSync } = require('node:fs');
const { once } = require('node:events');
const test = require('node:test');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const databasePath = 'database.db';

test('initialise le serveur et inscrit un utilisateur', async () => {
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

    const registerPage = await fetch(`http://localhost:${port}/register.html`);
    assert.equal(registerPage.status, 200);
    assert.match(await registerPage.text(), /Registre des justiciers/);

    const registration = await fetch(`http://localhost:${port}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '  batman  ',
        password: 'batmobile',
      }),
    });
    const registrationBody = await registration.json();

    assert.equal(registration.status, 201);
    assert.equal(registrationBody.user.username, 'batman');

    const database = new Database(databasePath, { readonly: true });
    const columns = database.prepare('PRAGMA table_info(users)').all();
    const user = database
      .prepare('SELECT username, password FROM users WHERE username = ?')
      .get('batman');
    database.close();

    assert.deepEqual(
      columns.map(({ name, type, notnull, pk }) => ({ name, type, notnull, pk })),
      [
        { name: 'id', type: 'INTEGER', notnull: 0, pk: 1 },
        { name: 'username', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'password', type: 'TEXT', notnull: 1, pk: 0 },
      ],
    );
    assert.equal(user.username, 'batman');
    assert.notEqual(user.password, 'batmobile');
    assert.equal(await bcrypt.compare('batmobile', user.password), true);

    const shortPassword = await fetch(`http://localhost:${port}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'robin', password: 'court' }),
    });
    assert.equal(shortPassword.status, 400);

    const usernameWithSpace = await fetch(`http://localhost:${port}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'bruce wayne',
        password: 'batmobile',
      }),
    });
    assert.equal(usernameWithSpace.status, 400);

    const duplicate = await fetch(`http://localhost:${port}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'batman', password: 'autrepass' }),
    });
    assert.equal(duplicate.status, 409);
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
