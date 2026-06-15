/**
 * 🏠 SmartThings MCP Server
 * Protocolo: MCP Streamable HTTP (2025-06-18)
 */

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const app   = express();
const PORT  = process.env.PORT || 3000;
const TOKEN = process.env.SMARTTHINGS_TOKEN;
const API   = 'https://api.smartthings.com/v1';

app.use(cors());
app.use(express.json());

if (!TOKEN) {
  console.error('❌ SMARTTHINGS_TOKEN não definido!');
  process.exit(1);
}

// ─── Helper API SmartThings ──────────────────────────────────────────────────

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

// ─── Ferramentas ─────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'listar_dispositivos',
    description: 'Lista todos os dispositivos SmartThings: luzes, tomadas, sensores, TVs, AC, etc.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'status_dispositivo',
    description: 'Mostra o status atual de um dispositivo',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'ID do dispositivo' },
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
    description: 'Desliga um dispositivo',
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
        deviceId:   { type: 'string', description: 'ID da lâmpada' },
        hue:        { type: 'number', description: 'Matiz 0–100 (0=vermelho, 33=verde, 66=azul)' },
        saturation: { type: 'number', description: 'Saturação 0–100' },
      },
      required: ['deviceId', 'hue', 'saturation'],
    },
  },
  {
    name: 'ajustar_brilho',
    description: 'Ajusta o brilho de uma lâmpada (dimmer)',
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
    description: 'Ajusta temperatura do ar-condicionado',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId:    { type: 'string', description: 'ID do AC' },
        temperatura: { type: 'number', description: 'Temperatura em °C' },
        modo:        { type: 'string', description: 'cool, heat, auto ou off', enum: ['cool', 'heat', 'auto', 'off'] },
      },
      required: ['deviceId', 'temperatura'],
    },
  },
  {
    name: 'listar_cenas',
    description: 'Lista todas as cenas/automações do SmartThings',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'executar_cena',
    description: 'Executa uma cena (ex: Modo Filme, Boa Noite)',
    inputSchema: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID da cena' },
      },
      required: ['sceneId'],
    },
  },
  {
    name: 'listar_localizacoes',
    description: 'Lista as casas/localizações configuradas',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'listar_comodos',
    description: 'Lista os cômodos de uma localização',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string', description: 'ID da localização' },
      },
      required: ['locationId'],
    },
  },
  {
    name: 'comando_avancado',
    description: 'Envia qualquer comando SmartThings',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId:   { type: 'string' },
        capability: { type: 'string' },
        command:    { type: 'string' },
        arguments:  { type: 'array', items: {} },
      },
      required: ['deviceId', 'capability', 'command'],
    },
  },
];

async function runTool(name, args = {}) {
  switch (name) {
    case 'listar_dispositivos': {
      const d = await st('/devices');
      if (!d.items?.length) return 'Nenhum dispositivo encontrado.';
      return d.items.map(i => `• ${i.label || i.name} (ID: ${i.deviceId})`).join('\n');
    }
    case 'status_dispositivo': {
      const d = await st(`/devices/${args.deviceId}/status`);
      return JSON.stringify(d.components?.main || d, null, 2);
    }
    case 'ligar_dispositivo': {
      await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [{ component: 'main', capability: 'switch', command: 'on' }],
      });
      return '✅ Dispositivo ligado!';
    }
    case 'desligar_dispositivo': {
      await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [{ component: 'main', capability: 'switch', command: 'off' }],
      });
      return '✅ Dispositivo desligado!';
    }
    case 'ajustar_cor_luz': {
      await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [{ component: 'main', capability: 'colorControl', command: 'setColor', arguments: [{ hue: args.hue, saturation: args.saturation }] }],
      });
      return `✅ Cor ajustada!`;
    }
    case 'ajustar_brilho': {
      await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [{ component: 'main', capability: 'switchLevel', command: 'setLevel', arguments: [args.nivel] }],
      });
      return `✅ Brilho ajustado para ${args.nivel}%`;
    }
    case 'ajustar_temperatura_ar': {
      const commands = [{ component: 'main', capability: 'thermostatCoolingSetpoint', command: 'setCoolingSetpoint', arguments: [args.temperatura] }];
      if (args.modo) commands.push({ component: 'main', capability: 'thermostatMode', command: 'setThermostatMode', arguments: [args.modo] });
      await st(`/devices/${args.deviceId}/commands`, 'POST', { commands });
      return `✅ Temperatura ajustada para ${args.temperatura}°C`;
    }
    case 'listar_cenas': {
      const d = await st('/scenes');
      if (!d.items?.length) return 'Nenhuma cena encontrada.';
      return d.items.map(s => `• ${s.sceneName} (ID: ${s.sceneId})`).join('\n');
    }
    case 'executar_cena': {
      await st(`/scenes/${args.sceneId}/execute`, 'POST');
      return '✅ Cena executada!';
    }
    case 'listar_localizacoes': {
      const d = await st('/locations');
      if (!d.items?.length) return 'Nenhuma localização encontrada.';
      return d.items.map(l => `• ${l.name} (ID: ${l.locationId})`).join('\n');
    }
    case 'listar_comodos': {
      const d = await st(`/locations/${args.locationId}/rooms`);
      if (!d.items?.length) return 'Nenhum cômodo encontrado.';
      return d.items.map(r => `• ${r.name} (ID: ${r.roomId})`).join('\n');
    }
    case 'comando_avancado': {
      const d = await st(`/devices/${args.deviceId}/commands`, 'POST', {
        commands: [{ component: 'main', capability: args.capability, command: args.command, arguments: args.arguments || [] }],
      });
      return `✅ Comando enviado!\n${JSON.stringify(d, null, 2)}`;
    }
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

// ─── Criar servidor MCP ──────────────────────────────────────────────────────

function createMCPServer() {
  const server = new Server(
    { name: 'smartthings-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    console.log(`🔧 ${name}`, args);
    try {
      const text = await runTool(name, args || {});
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      console.error(`❌ ${name}:`, err.message);
      return { content: [{ type: 'text', text: `❌ Erro: ${err.message}` }], isError: true };
    }
  });

  return server;
}

// ─── Rotas MCP (Streamable HTTP) ─────────────────────────────────────────────

const sessions = new Map();

// HEAD / — descoberta de protocolo
app.head('/', (req, res) => {
  res.setHeader('MCP-Protocol-Version', '2025-06-18');
  res.end();
});

// POST e GET / — endpoint principal MCP
app.all('/', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  try {
    let transport;

    if (req.method === 'POST' && !sessionId) {
      // Nova sessão
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      const server = createMCPServer();
      await server.connect(transport);

      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };

      await transport.handleRequest(req, res, req.body);

      if (transport.sessionId) {
        sessions.set(transport.sessionId, transport);
      }
    } else if (sessionId && sessions.has(sessionId)) {
      // Sessão existente
      transport = sessions.get(sessionId);
      await transport.handleRequest(req, res, req.body);
    } else {
      res.status(400).json({ error: 'Sessão inválida ou expirada' });
    }
  } catch (err) {
    console.error('Erro MCP:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (_, res) => {
  res.json({ status: '✅ online', service: 'SmartThings MCP', ferramentas: TOOLS.length });
});

app.listen(PORT, () => {
  console.log(`\n🏠 SmartThings MCP Server na porta ${PORT}`);
  console.log(`📡 Endpoint MCP: http://localhost:${PORT}/`);
  console.log(`🔑 Token: ${TOKEN ? '✅ configurado' : '❌ NÃO CONFIGURADO'}\n`);
});
