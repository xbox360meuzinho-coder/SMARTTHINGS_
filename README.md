# SmartThings MCP Server (protocolo MCP real)

Servidor que fala o protocolo **Model Context Protocol (MCP)** de verdade,
permitindo que o Claude liste e execute ações nos seus dispositivos
SmartThings diretamente durante a conversa — sem precisar copiar URLs
nem rodar comandos manuais.

## Diferença da versão anterior

A versão anterior (`smartthings-pat`) expunha uma API REST comum
(`/mcp/devices`, `/mcp/devices/:id/on`, etc). Isso funciona por fora, mas
o Claude não consegue "chamar" esses endpoints durante a conversa — só
Claude com acesso a ferramentas de rede consegue interagir com eles.

Esta versão implementa o protocolo MCP de verdade: um único endpoint
`/mcp` que fala JSON-RPC 2.0. Quando você adiciona esse servidor como
**Custom Connector** no Claude, ele passa a listar e executar as ferramentas
(`ligar_dispositivo`, `desligar_dispositivo`, etc) automaticamente, como
parte da conversa.

## Deploy no Render

1. Sobe esse repositório no GitHub (substitui `server.js`,
   `smartthingsClient.js` pelos novos, e adiciona `tools.js`).
2. Mantém a variável de ambiente `ST_PAT` já configurada no Render (o PAT
   do SmartThings).
3. Deploy automático via GitHub.

## Conectando no Claude

1. No Claude, vai em **Settings → Connectors** (ou **Customize → Connectors**)
2. Clica em **"+"** → **"Add custom connector"**
3. Cola a URL do endpoint MCP:
   ```
   https://smartthings-npm.onrender.com/mcp
   ```
4. Não precisa de OAuth Client ID/Secret (a autenticação é feita no
   próprio servidor via `ST_PAT`)
5. Clica em **"Add"**

Depois de conectado, você pode simplesmente pedir no chat: "liga a TV do
quarto" ou "qual o status da TV", e o Claude vai chamar as ferramentas
automaticamente.

## Ferramentas disponíveis

- `listar_dispositivos` — lista todos os dispositivos
- `status_dispositivo` — consulta status de um dispositivo
- `ligar_dispositivo` — liga um dispositivo
- `desligar_dispositivo` — desliga um dispositivo
- `enviar_comando` — comando customizado (volume, canal, etc)
- `listar_comodos` — lista os cômodos da casa

## Testando manualmente (opcional)

```bash
# Listar ferramentas disponíveis
curl -X POST https://smartthings-npm.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Chamar uma ferramenta
curl -X POST https://smartthings-npm.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"listar_dispositivos","arguments":{}}}'
```
