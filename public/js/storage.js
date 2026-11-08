/*
 * ObraSync - camada de armazenamento
 *
 * O app continua usando localStorage normalmente. Este arquivo:
 *  1. migra dados antigos (chaves "obrafacil_*" -> "obrasync_*");
 *  2. carrega os dados salvos no servidor (se o backend estiver rodando);
 *  3. envia as alterações para o servidor automaticamente;
 *  4. só então carrega o app.js.
 * Se o servidor estiver offline, tudo continua funcionando só no navegador.
 */
(function () {
  const PREFIX = 'obrasync_';
  const OLD_PREFIX = 'obrafacil_';
  const API = '/api/storage';

  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;

  function migrateOldKeys() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(OLD_PREFIX))
      .forEach((oldKey) => {
        const newKey = PREFIX + oldKey.slice(OLD_PREFIX.length);
        if (localStorage.getItem(newKey) === null) {
          nativeSet.call(localStorage, newKey, localStorage.getItem(oldKey));
        }
        nativeRemove.call(localStorage, oldKey);
      });
  }

  function snapshot() {
    const data = {};
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => { data[k] = localStorage.getItem(k); });
    return data;
  }

  let timer = null;
  let serverOnline = false;

  function pushToServer() {
    if (!serverOnline) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: snapshot() }),
        keepalive: true,
      }).catch(() => { /* offline: segue só no navegador */ });
    }, 600);
  }

  function watchChanges() {
    Storage.prototype.setItem = function (key, value) {
      nativeSet.call(this, key, value);
      if (this === localStorage && String(key).startsWith(PREFIX)) pushToServer();
    };
    Storage.prototype.removeItem = function (key) {
      nativeRemove.call(this, key);
      if (this === localStorage && String(key).startsWith(PREFIX)) pushToServer();
    };
  }

  async function loadFromServer() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    try {
      const res = await fetch(API, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) return;
      const { data } = await res.json();
      serverOnline = true;
      const keys = Object.keys(data || {});
      if (keys.length) {
        // servidor tem dados: ele é a fonte da verdade
        Object.keys(localStorage)
          .filter((k) => k.startsWith(PREFIX))
          .forEach((k) => nativeRemove.call(localStorage, k));
        keys.forEach((k) => nativeSet.call(localStorage, k, data[k]));
      } else if (Object.keys(snapshot()).length) {
        // servidor vazio, mas o navegador já tem dados: sobe para o servidor
        pushToServer();
      }
    } catch (e) {
      /* servidor indisponível */
    } finally {
      clearTimeout(t);
    }
  }

  function startApp() {
    const s = document.createElement('script');
    s.src = 'js/app.js';
    s.onload = () => window.dispatchEvent(new Event('obrasync:ready'));
    document.body.appendChild(s);
  }

  (async function boot() {
    migrateOldKeys();
    await loadFromServer();
    watchChanges();
    startApp();
  })();
})();
