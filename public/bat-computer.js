const welcome = document.querySelector('#welcome');
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

showWelcome();
