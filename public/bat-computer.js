const welcome = document.querySelector('#welcome');
const arsenal = document.querySelector('#arsenal');
const reportForm = document.querySelector('#report-form');
const reportMessage = document.querySelector('#report-message');

function getAuthHeader() {
  let username = sessionStorage.getItem('username');
  let password = sessionStorage.getItem('password');

  if (!username || !password) {
    username = prompt('Nom d’utilisateur') || '';
    password = prompt('Mot de passe') || '';
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('password', password);
  }

  return 'Basic ' + btoa(username + ':' + password);
}

async function showWelcome() {
  try {
    const response = await fetch('/api/me', {
      headers: {
        Authorization: getAuthHeader(),
      },
    });
    const result = await response.json();

    if (!response.ok) {
      welcome.textContent = result.message || 'Profil introuvable.';
      return;
    }

    welcome.textContent = 'Bienvenue, Justicier ' + result.username;
  } catch {
    welcome.textContent = 'Le serveur est momentanément indisponible.';
  }
}

reportForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const content = document.querySelector('#content').value.trim();

  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({ content }),
    });
    const result = await response.json();

    reportMessage.textContent = result.message;
    reportMessage.className = `alert mt-3 ${response.ok ? 'alert-success' : 'alert-danger'}`;

    if (response.ok) {
      reportForm.reset();
    }
  } catch {
    reportMessage.textContent = 'Le serveur est momentanément indisponible.';
    reportMessage.className = 'alert alert-danger mt-3';
  }
});

async function showArsenal() {
  try {
    const headers = new Headers();
    headers.set('Authorization', getAuthHeader());

    const response = await fetch('/api/secrets', { headers });
    const gadgets = await response.json();

    if (!response.ok) {
      arsenal.innerHTML = '<p>Impossible de charger l’arsenal.</p>';
      return;
    }

    arsenal.innerHTML = '';

    gadgets.forEach((gadget) => {
      const column = document.createElement('div');
      column.className = 'col-12 col-md-4';
      column.innerHTML = `
        <article class="card h-100 text-dark">
          <div class="card-body">
            <h3 class="h5">
              <i class="fa-solid ${gadget.icon}"></i>
              ${gadget.name}
            </h3>
            <p class="mb-0">${gadget.desc}</p>
          </div>
        </article>
      `;
      arsenal.appendChild(column);
    });
  } catch {
    arsenal.innerHTML = '<p>Le serveur est momentanément indisponible.</p>';
  }
}

async function startPage() {
  await showWelcome();
  await showArsenal();
}

startPage();
