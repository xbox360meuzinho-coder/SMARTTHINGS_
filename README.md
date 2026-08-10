# SmartThings MCP Server

Servidor que conecta o Claude aos seus dispositivos SmartThings via OAuth 2.0.

## Como funciona

1. Você faz login uma vez em `/oauth/login` — ele te redireciona pro SmartThings,
   você autoriza, e o servidor guarda o token (com refresh automático).
2. O Claude chama os endpoints `/mcp/*` para listar e controlar dispositivos.
3. O SmartThings chama `/smartapp` automaticamente para verificar que o app existe
   (isso é obrigatório, faz parte do protocolo — não precisa mexer).

## Deploy no Render

1. Sobe esse repositório no GitHub.
2. No Render, cria um **Web Service** novo apontando pro repo.
   - Build command: `npm install`
   - Start command: `npm start`
3. Nas variáveis de ambiente (Environment) do Render, adiciona:
   - `ST_CLIENT_ID` — o Client ID gerado no SmartThings Developer Workspace
   - `ST_CLIENT_SECRET` — o Client Secret gerado lá
   - `BASE_URL` — a URL pública do seu serviço no Render (ex: `https://smartthings-npm.onrender.com`)
   - `SESSION_SECRET` — qualquer string aleatória longa
4. Deploy.

## Primeiro login

Depois do deploy, acesse pelo navegador:

```
https://SEU-DOMINIO.onrender.com/oauth/login
```

Isso vai te levar pra tela de autorização do SmartThings. Autorize e pronto —
o token fica salvo no servidor.

⚠️ **Atenção**: no plano free do Render, o disco não é persistente entre
reinícios. Isso significa que se o servidor cair e subir de novo (por exemplo,
após um período de inatividade), pode ser necessário refazer esse login.
Se isso incomodar no dia a dia, o próximo passo é migrar o armazenamento do
token para um banco externo (Render Postgres free tier, por exemplo).

## Testando os endpoints

```bash
# Listar dispositivos
curl https://SEU-DOMINIO.onrender.com/mcp/devices

# Ligar um dispositivo
curl -X POST https://SEU-DOMINIO.onrender.com/mcp/devices/DEVICE_ID/on

# Desligar um dispositivo
curl -X POST https://SEU-DOMINIO.onrender.com/mcp/devices/DEVICE_ID/off
```

## Configuração no SmartThings Developer Workspace

- **Target URL**: `https://SEU-DOMINIO.onrender.com/smartapp`
- **Redirect URI** (OAuth): `https://SEU-DOMINIO.onrender.com/oauth/callback`
- **Scopes**: `r:devices:*`, `x:devices:*`, `r:locations:*`
