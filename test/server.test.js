const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { existsSync, readFileSync, unlinkSync } = require('node:fs');
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
    env: { ...process.env, PORT: '3456', SESSION_SECRET: 'test_secret_session' },
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

    const serverSource = readFileSync('server.js', 'utf8');
    assert.doesNotMatch(serverSource, /app\.(get|post)\(/);
    assert.match(serverSource, /require\('\.\/routes\/auth'\)/);
    assert.match(serverSource, /require\('\.\/routes\/batcomputer'\)/);
    assert.match(serverSource, /require\('dotenv'\)/);
    assert.match(serverSource, /require\('express-session'\)/);
    assert.match(serverSource, /process\.env\.PORT/);
    assert.match(serverSource, /process\.env\.SESSION_SECRET/);
    assert.match(serverSource, /bat_identity/);
    assert.match(serverSource, /httpOnly:\s*true/);
    assert.match(serverSource, /sameSite:\s*['"]strict['"]/);
    assert.match(serverSource, /maxAge:\s*1800000/);
    assert.match(serverSource, /urlencoded/);
    assert.match(readFileSync('.gitignore', 'utf8'), /\.env/);
    assert.match(readFileSync('routes/auth.js', 'utf8'), /session\.regenerate/);
    assert.match(readFileSync('routes/auth.js', 'utf8'), /session\.destroy/);
    assert.match(readFileSync('routes/auth.js', 'utf8'), /clearCookie\('bat_identity'\)/);
    assert.equal(existsSync('config/db.js'), true);
    assert.equal(existsSync('middlewares/checkAuth.js'), true);
    assert.equal(existsSync('middlewares/authCheck.js'), true);
    assert.match(readFileSync('middlewares/authCheck.js', 'utf8'), /isAuthenticated/);
    assert.equal(existsSync('views/bat-computer.html'), true);
    assert.equal(existsSync('views/login.html'), true);

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

    const loginPage = await fetch(`http://localhost:${port}/auth/login`);
    assert.equal(loginPage.status, 200);
    const loginHtml = await loginPage.text();
    assert.match(loginHtml, /name="username"/);
    assert.match(loginHtml, /name="password"/);
    assert.match(loginHtml, /action="\/auth\/login"/);

    const badLogin = await fetch(`http://localhost:${port}/auth/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=batman&password=mauvaispass',
    });
    assert.equal(badLogin.status, 302);
    assert.match(badLogin.headers.get('location') || '', /\/auth\/login/);
    assert.equal((badLogin.headers.get('set-cookie') || '').includes('bat_identity'), false);

    const goodLogin = await fetch(`http://localhost:${port}/auth/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=batman&password=batmobile',
    });
    const cookie1 = goodLogin.headers.get('set-cookie') || '';
    assert.equal(goodLogin.status, 302);
    assert.match(goodLogin.headers.get('location') || '', /\/bat-computer/);
    assert.match(cookie1, /bat_identity/);

    const secondLogin = await fetch(`http://localhost:${port}/auth/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie1.split(';')[0],
      },
      body: 'username=batman&password=batmobile',
    });
    const cookie2 = secondLogin.headers.get('set-cookie') || '';
    assert.equal(secondLogin.status, 302);
    assert.match(cookie2, /bat_identity/);
    assert.notEqual(cookie1, cookie2);

    const duplicate = await fetch(`http://localhost:${port}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'batman', password: 'autrepass' }),
    });
    assert.equal(duplicate.status, 409);

    const sessionCookie = cookie2.split(';')[0];

    const secretWithoutAuth = await fetch(`http://localhost:${port}/api/secrets`);
    assert.equal(secretWithoutAuth.status, 401);

    const batComputerWithoutAuth = await fetch(`http://localhost:${port}/bat-computer`, {
      redirect: 'manual',
    });
    assert.equal(batComputerWithoutAuth.status, 302);
    assert.match(batComputerWithoutAuth.headers.get('location') || '', /\/auth\/login/);

    const secretOk = await fetch(`http://localhost:${port}/api/secrets`, {
      headers: { Cookie: sessionCookie },
    });
    const secrets = await secretOk.json();

    assert.equal(secretOk.status, 200);
    assert.equal(Array.isArray(secrets), true);
    assert.equal(secrets[0].name, 'Batarang');

    const batComputerOk = await fetch(`http://localhost:${port}/bat-computer`, {
      headers: { Cookie: sessionCookie },
    });
    assert.equal(batComputerOk.status, 200);
    const batComputerPage = await batComputerOk.text();
    assert.match(batComputerPage, /Bienvenue, batman/);
    assert.match(batComputerPage, /id="arsenal"/);
    assert.match(batComputerPage, /href="\/auth\/logout"/);

    const batComputerScript = await fetch(`http://localhost:${port}/bat-computer.js`);
    const scriptText = await batComputerScript.text();
    assert.equal(batComputerScript.status, 200);
    assert.match(scriptText, /\/api\/secrets/);
    assert.doesNotMatch(scriptText, /getAuthHeader|Authorization/);

    const meWithoutAuth = await fetch(`http://localhost:${port}/api/me`);
    assert.equal(meWithoutAuth.status, 401);

    const meOk = await fetch(`http://localhost:${port}/api/me`, {
      headers: { Cookie: sessionCookie },
    });
    const meBody = await meOk.json();
    assert.equal(meOk.status, 200);
    assert.equal(meBody.username, 'batman');
    assert.ok(meBody.id);

    const emptyReport = await fetch(`http://localhost:${port}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ content: '   ' }),
    });
    assert.equal(emptyReport.status, 400);

    const reportOk = await fetch(`http://localhost:${port}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ content: 'Mission accomplie à Gotham.' }),
    });
    const reportBody = await reportOk.json();
    assert.equal(reportOk.status, 201);
    assert.equal(reportBody.report.content, 'Mission accomplie à Gotham.');

    const reportsDb = new Database(databasePath, { readonly: true });
    const reportColumns = reportsDb.prepare('PRAGMA table_info(reports)').all();
    const savedReport = reportsDb
      .prepare('SELECT user_id, content FROM reports WHERE id = ?')
      .get(reportBody.report.id);
    reportsDb.close();

    assert.deepEqual(
      reportColumns.map(({ name, type, notnull, pk }) => ({ name, type, notnull, pk })),
      [
        { name: 'id', type: 'INTEGER', notnull: 0, pk: 1 },
        { name: 'user_id', type: 'INTEGER', notnull: 1, pk: 0 },
        { name: 'content', type: 'TEXT', notnull: 1, pk: 0 },
      ],
    );
    assert.equal(savedReport.user_id, meBody.id);
    assert.equal(savedReport.content, 'Mission accomplie à Gotham.');

    const logout = await fetch(`http://localhost:${port}/auth/logout`, {
      redirect: 'manual',
      headers: { Cookie: sessionCookie },
    });
    const logoutCookie = logout.headers.get('set-cookie') || '';
    assert.equal(logout.status, 302);
    assert.match(logout.headers.get('location') || '', /\/auth\/login/);
    assert.match(logoutCookie, /bat_identity/);
    assert.match(logoutCookie, /Max-Age=0|Expires=/);

    const batComputerAfterLogout = await fetch(`http://localhost:${port}/bat-computer`, {
      redirect: 'manual',
      headers: { Cookie: sessionCookie },
    });
    assert.equal(batComputerAfterLogout.status, 302);
    assert.match(batComputerAfterLogout.headers.get('location') || '', /\/auth\/login/);

    const secretAfterLogout = await fetch(`http://localhost:${port}/api/secrets`, {
      headers: { Cookie: sessionCookie },
    });
    assert.equal(secretAfterLogout.status, 401);
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
