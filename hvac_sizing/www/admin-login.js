(() => {
  const dictionary = {
    it: {eyebrow: 'DIMENSIONAMENTO CLIMATIZZAZIONE PRO', title: 'Accesso alla app', help: 'Inserisci nome utente e password. Per l’amministratore principale lascia vuoto il nome utente e usa la password delle opzioni dell’add-on.', username: 'Nome utente', password: 'Password', submit: 'Accedi', security: 'Connessione protetta · sessione temporanea di 8 ore', network: 'Errore di comunicazione', failed: 'Accesso non riuscito'},
    de: {eyebrow: 'KLIMAANLAGEN-DIMENSIONIERUNG PRO', title: 'App-Anmeldung', help: 'Benutzername und Passwort eingeben. Für den Hauptadministrator den Benutzernamen leer lassen und das Passwort aus den Add-on-Optionen verwenden.', username: 'Benutzername', password: 'Passwort', submit: 'Anmelden', security: 'Geschützte Verbindung · befristete Sitzung von 8 Stunden', network: 'Verbindungsfehler', failed: 'Anmeldung fehlgeschlagen'}
  };
  let language = 'it';
  try { language = localStorage.getItem('hvac-language') === 'de' ? 'de' : 'it'; } catch (_) {}
  const t = key => dictionary[language][key] || dictionary.it[key] || key;
  function apply() {
    document.documentElement.lang = language;
    document.title = t('title');
    document.querySelectorAll('[data-t]').forEach(node => { node.textContent = t(node.dataset.t); });
    document.querySelectorAll('[data-lang]').forEach(button => {
      const active = button.dataset.lang === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    language = button.dataset.lang;
    try { localStorage.setItem('hvac-language', language); } catch (_) {}
    apply();
  }));
  apply();

  const form = document.querySelector('#admin-login-form');
  const error = document.querySelector('#admin-login-error');
  const submit = document.querySelector('#admin-login-submit');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.classList.add('hidden');
    submit.disabled = true;
    try {
      const response = await fetch('/admin/api/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: document.querySelector('#app-username').value.trim(), password: document.querySelector('#admin-password').value})});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((language === 'de' ? data.error_de : data.error) || data.error || (response.status ? t('failed') : t('network')));
      location.replace('/admin/');
    } catch (reason) {
      error.textContent = reason instanceof TypeError ? t('network') : reason.message;
      error.classList.remove('hidden');
      document.querySelector('#admin-password').select();
    } finally { submit.disabled = false; }
  });
})();
