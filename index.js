/**
 * 🏠 SmartThings MCP Server
 * Conecta o Claude ao Samsung SmartThings
 * 
 * Variáveis de ambiente necessárias:
 *   SMARTTHINGS_TOKEN  → Token pessoal do SmartThings
 *   PORT               → Porta do servidor (padrão: 3000)
 */

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ─── Configuração ────────────────────────────────────────────────────────────

const app   = express();
const PORT  = process.env.PORT || 3000;
const TOKEN = process.env.SMARTTHINGS_TOKEN;
const API   = 'https://api.smartthings.com/v1';

app.use(cors());
app.use(express.json());

if (!TOKEN) {
  console.error('❌ SMARTTHINGS_TOKEN não definido! Configure a variável de ambiente.');
  process.exit(1);
}

// ─── Helper da API SmartThings ───────────────────────────────────────────────

async function st(path, method = 'GET', body = null) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`SmartThings ${res.status}: ${text}`);

  return text ? JSON.parse(text) : {};
}

// ─── Ferramentas MCP ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'listar_dispositivos',
    description: 'Lista todos os dispositivos SmartThings: luzes, tomadas, sensores, TVs, AC, etc.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'status_dispositivo',
    description: 'Mostra o status atual de um dispositivo (ligado/desligado, temperatura, nível de luz, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'ID do dispositivo (obtido em listar_dispositivos)' },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'ligar_dispositivo',
    description: 'Liga um dispositivo (lâmpada, tomada inteligente, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'ID do dispositivo' },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'desligar_dispositivo',
    description: 'Desliga um dispositivo (lâmpada, tomada inteligente, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'ID do dispositivo' },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'ajustar_cor_luz',
    description: 'Muda a cor de uma lâmpada inteligente RGB',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'ID da lâmpada' },
        hue:        { type: 'number', description: 'Matiz 0–100 (0=vermelho, 33=verde, 66=azul)' },
        saturation: { type: 'number', description: 'Saturação 0–100 (0=branco, 100=cor pura)' },
      },
      required: ['deviceId', 'hue', 'saturation'],
    },
  },
  {
    name: 'ajustar_brilho',
    description: 'Ajusta o brilho de uma lâmpada inteligente (dimmer)',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'ID da lâmpada' },
        nivel:    { type: 'number', description: 'Nível de 0 a 100' },
      },
      required: ['deviceId', 'nivel'],
    },
  },
  {
    name: 'ajustar_temperatura_ar',
    description: 'Ajusta a temperatura do ar-condicionado ou termostato',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId:    { type: 'string', description: 'ID do AC ou termostato' },
        temperatura: { type: 'number', description: 'Temperatura desejada em graus Celsius' },
        modo:        { type: 'string', description: 'Modo: cool, heat, auto, off', enum: ['cool', 'heat', 'auto', 'off'] },
      },
      required: ['deviceId', 'temperatura'],
    },
  },
  {
    name: 'listar_cenas',
    description: 'Lista todas as cenas criadas no SmartThings (ex: Modo Filme, Boa Noite, Chegando em Casa)',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'executar_cena',
    description: 'Executa uma cena — ativa múltiplos dispositivos de uma vez',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID da cena (obtido em listar_cenas)' },
      },
      required: ['sceneId'],
    },
  },
  {
    name: 'listar_localizacoes',
    description: 'Lista as casas/localizações configuradas na sua conta SmartThings',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'listar_comodos',
    description: 'Lista os cômodos de uma localização (sala, quarto, cozinha, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string', description: 'ID da localização (obtido em listar_localizacoes)' },
      },
      required: ['locationId'],
    },
  },
  {
    name: 'comando_avancado',
    description: 'Envia qualquer comando SmartThings avançado (para usuários experientes)',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId:   { type: 'string', description: 'ID do dispositivo' },
        capability: { type: 'string', description: 'Capability SmartThings (ex: switch, colorControl, thermostat)' },
        command:    { type: 'string', description: 'Comando (ex: on, off, setHue, setCoolingSetpoint)' },
        arguments:  { type: 'array',  description: 'Argumentos do comando (opcional)', items: {} },
      },
      required: ['deviceId', 'capability', 'command'],
    },
  },
];

// ─── Lógica das ferramentas ───────────────────────────────────────────────────

async function runTool(name, args = {}) {
  switch (name) {

    case 'listar_dispositivos': {
      const d = await st('/devices');
      if (!d.items?.length) return 'Nenhum dispositivo encontrado.';
      return d.items
        .map(i => `• ${i.label || i.name}\n  ID: ${i.deviceId}\n  Tipo: ${i.deviceTypeName || i.components?.[0]?.categories?.[0]?.name || 'N/A'}`)
        .join('\n\n');
    }

    case 'status_dispositivo': {
      const d = await st(`/devices/${args.deviceId}/status`);
      const comp = d.components?.main || d;
      return JSON.stringify(comp, null, 2);
    }

    case 'ligar_dispositivo': {
      await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [{ component: 'main', capability: 'switch', command: 'on' }],
      });
      return `✅ Dispositivo ligado!`;
    }

    case 'desligar_dispositivo': {
      await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [{ component: 'main', capability: 'switch', command: 'off' }],
      });
      return `✅ Dispositivo desligado!`;
    }

    case 'ajustar_cor_luz': {
      await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [
          { component: 'main', capability: 'colorControl', command: 'setColor', arguments: [{ hue: args.hue, saturation: args.saturation }] },
        ],
      });
      return `✅ Cor ajustada! Matiz: ${args.hue}, Saturação: ${args.saturation}`;
    }

    case 'ajustar_brilho': {
      await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [
          { component: 'main', capability: 'switchLevel', command: 'setLevel', arguments: [args.nivel] },
        ],
      });
      return `✅ Brilho ajustado para ${args.nivel}%`;
    }

    case 'ajustar_temperatura_ar': {
      const commands = [
        { component: 'main', capability: 'thermostatCoolingSetpoint', command: 'setCoolingSetpoint', arguments: [args.temperatura] },
      ];
      if (args.modo) {
        commands.push({ component: 'main', capability: 'thermostatMode', command: 'setThermostatMode', arguments: [args.modo] });
      }
      await st(`/devices/${args.deviceId}/commands`, 'POST', { commands });
      return `✅ Temperatura ajustada para ${args.temperatura}°C${args.modo ? `, modo: ${args.modo}` : ''}`;
    }

    case 'listar_cenas': {
      const d = await st('/scenes');
      if (!d.items?.length) return 'Nenhuma cena encontrada.';
      return d.items.map(s => `• ${s.sceneName}\n  ID: ${s.sceneId}`).join('\n\n');
    }

    case 'executar_cena': {
      await st(`/scenes/${args.sceneId}/execute`, 'POST');
      return `✅ Cena executada com sucesso!`;
    }

    case 'listar_localizacoes': {
      const d = await st('/locations');
      if (!d.items?.length) return 'Nenhuma localização encontrada.';
      return d.items.map(l => `• ${l.name}\n  ID: ${l.locationId}`).join('\n\n');
    }

    case 'listar_comodos': {
      const d = await st(`/locations/${args.locationId}/rooms`);
      if (!d.items?.length) return 'Nenhum cômodo encontrado.';
      return d.items.map(r => `• ${r.name}\n  ID: ${r.roomId}`).join('\n\n');
    }

    case 'comando_avancado': {
      const d = await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [{
          component:  'main',
          capability: args.capability,
          command:    args.command,
          arguments:  args.arguments || [],
        }],
      });
      return `✅ Comando enviado!\n${JSON.stringify(d, null, 2)}`;
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

// ─── Servidor MCP via SSE ─────────────────────────────────────────────────────

const transports = new Map();

app.get('/sse', async (req, res) => {
  console.log('🔌 Nova conexão MCP estabelecida');

  const server = new Server(
    { name: 'smartthings-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.log(`🔧 Chamando ferramenta: ${name}`, args);
    try {
      const text = await runTool(name, args || {});
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      console.error(`❌ Erro em ${name}:`, err.message);
      return { content: [{ type: 'text', text: `❌ Erro: ${err.message}` }], isError: true };
    }
  });

  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);

  res.on('close', () => {
    console.log(`🔌 Conexão encerrada: ${transport.sessionId}`);
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);
  if (!transport) return res.status(404).json({ error: 'Sessão não encontrada' });
  await transport.handlePostMessage(req, res);
});

// Health check
app.get('/', (_, res) => {
  res.json({
    status: '✅ online',
    service: 'SmartThings MCP Server',
    ferramentas: TOOLS.length,
    token_configurado: !!TOKEN,
  });
});

app.listen(PORT, () => {
  console.log(`\n🏠 SmartThings MCP Server rodando na porta ${PORT}`);
  console.log(`📡 Endpoint SSE: http://localhost:${PORT}/sse`);
  console.log(`🔑 Token: ${TOKEN ? '✅ configurado' : '❌ NÃO CONFIGURADO'}\n`);
});
