const arsenal = document.querySelector('#arsenal');
const reportForm = document.querySelector('#report-form');
const reportMessage = document.querySelector('#report-message');

reportForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const content = document.querySelector('#content').value.trim();

  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch('/api/secrets');
    const gadgets = await response.json();

    if (!response.ok) {
      arsenal.innerHTML = '<p>Impossible de charger l’arsenal.</p>';
      return;
    }

    arsenal.innerHTML = '';

    gadgets.forEach((gadget) => {
      const col = document.createElement('div');
      col.className = 'col-12 col-md-4';
      col.innerHTML = `
        <div class="card h-100 text-dark">
          <div class="card-body">
            <h3 class="h5">
              <i class="fa-solid ${gadget.icon}"></i>
              ${gadget.name}
            </h3>
            <p class="mb-0">${gadget.desc}</p>
          </div>
        </div>
      `;
      arsenal.appendChild(col);
    });
  } catch {
    arsenal.innerHTML = '<p>Le serveur est momentanément indisponible.</p>';
  }
}

showArsenal();
