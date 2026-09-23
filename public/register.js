const form = document.querySelector('#register-form');
const message = document.querySelector('#message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.querySelector('#username').value.trim();
  const password = document.querySelector('#password').value;

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    message.textContent = result.message;
    message.className = `alert mt-3 ${response.ok ? 'alert-success' : 'alert-danger'}`;

    if (response.ok) {
      form.reset();
    }
  } catch {
    message.textContent = 'Le serveur est momentanément indisponible.';
    message.className = 'alert alert-danger mt-3';
  }
});
