# SmartThings MCP Server (versão PAT)

Servidor simplificado que conecta o Claude aos seus dispositivos SmartThings
usando um Personal Access Token (PAT) — sem fluxo OAuth completo.

## Como funciona

1. Você gera um PAT (Personal Access Token) uma vez em
   https://account.smartthings.com/tokens
2. Cola esse token na variável de ambiente `ST_PAT` no Render.
3. O Claude chama os endpoints `/mcp/*` para listar e controlar dispositivos,
   e o servidor usa o PAT pra autenticar com a API do SmartThings.

## Deploy no Render

1. Sobe esse repositório no GitHub (substitui os arquivos antigos: `server.js`,
   `smartthingsClient.js`, `package.json`, `.env.example`, `.gitignore`).
   **Pode deletar `auth.js` e `tokenStore.js`** — não são mais necessários.
2. No Render, no serviço já existente `smartthings-npm`, isso vai fazer
   redeploy automático assim que detectar o push no GitHub.
3. Nas variáveis de ambiente (Environment) do Render, **remove** as antigas
   (`ST_CLIENT_ID`, `ST_CLIENT_SECRET`, `BASE_URL`, `SESSION_SECRET`) e
   adiciona só:
   - `ST_PAT` — o Personal Access Token gerado no passo 1
4. Salva e espera o redeploy.

## Gerando o PAT

1. Acesse https://account.smartthings.com/tokens
2. Clica em **"Generate new token"**
3. Dá um nome (ex: `Claude MCP`)
4. Marca os escopos:
   - `r:devices:*` (ler dispositivos)
   - `x:devices:*` (executar comandos)
   - `r:locations:*` (ler localizações/cômodos)
5. Escolhe a validade (recomendado: a maior disponível, tipo 1 ano, pra não
   precisar renovar toda hora)
6. Copia o token gerado — **só aparece uma vez**

⚠️ **Quando o token expirar**: é só gerar um novo token (mesmo processo acima)
e colar no lugar do antigo na variável `ST_PAT` no Render. Não precisa mexer
em mais nada.

## Testando os endpoints

```bash
# Listar dispositivos
curl https://smartthings-npm.onrender.com/mcp/devices

# Ligar um dispositivo
curl -X POST https://smartthings-npm.onrender.com/mcp/devices/DEVICE_ID/on

# Desligar um dispositivo
curl -X POST https://smartthings-npm.onrender.com/mcp/devices/DEVICE_ID/off
```
