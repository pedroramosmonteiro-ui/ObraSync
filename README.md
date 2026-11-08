# ObraSync

Orçamentos, clientes, materiais e agenda para prestadores de serviço de construção civil.

## Como rodar

Precisa do [Node.js](https://nodejs.org) 18 ou superior.

```bash
npm install
npm start
```

Abra **http://localhost:3000** no navegador.

Para mudar a porta: `PORT=4000 npm start` (Windows PowerShell: `$env:PORT=4000; npm start`).

## Estrutura

```
obrasync/
├── server.js          # Backend (Express): serve o app e salva os dados
├── package.json
├── data/              # Dados salvos (db.json) — fica fora do Git
└── public/            # Frontend
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js       # Lógica do app
        └── storage.js   # Sincroniza os dados com o servidor
```

## Como os dados são salvos

O app guarda tudo no navegador (localStorage) e, com o servidor rodando, sincroniza
automaticamente com o arquivo `data/db.json`. Se o servidor estiver desligado, o app
continua funcionando só no navegador. O botão **Backup** do painel continua disponível.

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Verifica se o servidor está no ar |
| GET | `/api/storage` | Retorna os dados salvos |
| PUT | `/api/storage` | Salva os dados (só chaves `obrasync_*`, valores em texto) |

## Segurança

- Esta versão **não tem login**: foi feita para uso pessoal. Por padrão o servidor só aceita
  conexões do próprio computador (`127.0.0.1`).
- Para publicar na internet ou usar com vários clientes, adicione autenticação e
  separação de dados por usuário antes (use `HOST=0.0.0.0` apenas atrás de uma proteção).
