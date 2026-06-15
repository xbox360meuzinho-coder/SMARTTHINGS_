# 🏠 SmartThings MCP Server

Conecta o **Claude** ao **Samsung SmartThings**, permitindo controlar toda sua casa inteligente por conversa.

---

## O que você pode fazer

| Comando | Descrição |
|---|---|
| "Lista meus dispositivos" | Mostra todas as luzes, tomadas, sensores |
| "Liga a luz da sala" | Liga um dispositivo |
| "Desliga o ar da cozinha" | Desliga um dispositivo |
| "Coloca a luz no azul" | Muda a cor de lâmpadas RGB |
| "Baixa o brilho para 30%" | Controla dimmer |
| "Bota o ar no 22 graus" | Ajusta temperatura do AC |
| "Ativa o modo cinema" | Executa uma cena |

---

## Instalação (5 minutos)

### 1. Gerar o Token do SmartThings

1. Acesse: https://account.smartthings.com/tokens
2. Clique em **"Generate new token"**
3. Dê um nome (ex: "Claude MCP")
4. Marque todas as permissões que quiser
5. Copie o token gerado (só aparece uma vez!)

### 2. Configurar o Servidor

```bash
# Clone ou baixe os arquivos
cd smartthings-mcp

# Instale as dependências
npm install

# Configure o token
export SMARTTHINGS_TOKEN="seu-token-aqui"

# Inicie o servidor
npm start
```

---

## Deploy no Render.com (grátis)

Para o Claude.ai acessar de qualquer lugar, suba no Render:

1. Crie conta em https://render.com
2. **New → Web Service**
3. Conecte ao seu repositório GitHub (com esses arquivos)
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** `SMARTTHINGS_TOKEN = seu-token`
5. Deploy!
6. Copie a URL gerada (ex: `https://smartthings-mcp.onrender.com`)

---

## Conectar ao Claude.ai

1. Acesse claude.ai → **Configurações**
2. Vá em **Integrações** ou **MCP Servers**
3. Adicione uma nova integração com a URL:
   ```
   https://sua-url.onrender.com/sse
   ```
4. Salve e pronto!

---

## Ferramentas disponíveis

| Ferramenta | O que faz |
|---|---|
| `listar_dispositivos` | Lista todos os dispositivos |
| `status_dispositivo` | Status detalhado de um dispositivo |
| `ligar_dispositivo` | Liga (switch on) |
| `desligar_dispositivo` | Desliga (switch off) |
| `ajustar_cor_luz` | Muda cor RGB de lâmpadas |
| `ajustar_brilho` | Nível de 0-100% |
| `ajustar_temperatura_ar` | Temperatura e modo do AC |
| `listar_cenas` | Lista cenas/automações |
| `executar_cena` | Ativa uma cena |
| `listar_localizacoes` | Lista suas casas |
| `listar_comodos` | Lista os cômodos |
| `comando_avancado` | Qualquer comando SmartThings |

---

## Problemas comuns

**"Token inválido"** → Verifique se copiou o token completo e sem espaços

**"Dispositivo não encontrado"** → Use `listar_dispositivos` primeiro para pegar o ID correto

**"Conexão recusada"** → Verifique se o servidor está rodando e a URL está correta
