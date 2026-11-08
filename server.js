const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const KEY_PATTERN = /^obrasync_[a-z0-9_]{1,80}$/i;
const MAX_KEYS = 500;

fs.mkdirSync(DATA_DIR, { recursive: true });

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}

// escrita atômica: grava em arquivo temporário e renomeia
function writeDb(data) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, DB_FILE);
}

function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.length > MAX_KEYS) return false;
  return keys.every((k) => KEY_PATTERN.test(k) && typeof data[k] === 'string');
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '15mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'ObraSync' }));

app.get('/api/storage', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ data: readDb() });
});

app.put('/api/storage', (req, res) => {
  const data = req.body && req.body.data;
  if (!validate(data)) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }
  try {
    writeDb(data);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar:', err.message);
    res.status(500).json({ error: 'Não foi possível salvar os dados.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// erros (ex.: JSON malformado ou corpo grande demais)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: status === 413 ? 'Dados grandes demais.' : 'Requisição inválida.' });
});

app.listen(PORT, HOST, () => {
  console.log(`ObraSync rodando em http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
