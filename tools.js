// Define as "tools" (ferramentas) que este servidor MCP expõe ao Claude.
// Cada tool tem um nome, descrição, e um schema JSON dos parâmetros que aceita.
// O Claude lê essa lista via "tools/list" e decide quando chamar cada uma.

const st = require("./smartthingsClient");

const TOOLS = [
  {
    name: "listar_dispositivos",
    description:
      "Lista todos os dispositivos SmartThings do usuário, com seus IDs, nomes e capacidades disponíveis.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "status_dispositivo",
    description:
      "Consulta o status atual (ligado/desligado, volume, canal, etc) de um dispositivo específico pelo deviceId.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: {
          type: "string",
          description: "O ID do dispositivo (obtido via listar_dispositivos)",
        },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "ligar_dispositivo",
    description: "Liga um dispositivo (ex: TV, luz, tomada) pelo deviceId.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: {
          type: "string",
          description: "O ID do dispositivo a ser ligado",
        },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "desligar_dispositivo",
    description: "Desliga um dispositivo (ex: TV, luz, tomada) pelo deviceId.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: {
          type: "string",
          description: "O ID do dispositivo a ser desligado",
        },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "enviar_comando",
    description:
      "Envia um comando customizado para um dispositivo (ex: mudar canal, ajustar volume). Use quando ligar/desligar não for suficiente.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: { type: "string", description: "O ID do dispositivo" },
        capability: {
          type: "string",
          description: "A capability do SmartThings (ex: 'audioVolume', 'tvChannel', 'switch')",
        },
        command: {
          type: "string",
          description: "O comando a executar (ex: 'setVolume', 'setTvChannel', 'on')",
        },
        args: {
          type: "array",
          description: "Argumentos do comando, se houver (ex: [50] para setVolume)",
          items: {},
        },
      },
      required: ["deviceId", "capability", "command"],
    },
  },
  {
    name: "listar_comodos",
    description: "Lista os cômodos (rooms) cadastrados na casa do usuário.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Executa a tool solicitada e retorna o resultado em formato MCP
// (content: array de blocos de texto/dados)
async function callTool(name, args) {
  switch (name) {
    case "listar_dispositivos": {
      const devices = await st.listDevices();
      return textResult(JSON.stringify(devices, null, 2));
    }

    case "status_dispositivo": {
      const status = await st.getDeviceStatus(args.deviceId);
      return textResult(JSON.stringify(status, null, 2));
    }

    case "ligar_dispositivo": {
      const result = await st.turnOn(args.deviceId);
      return textResult(`Dispositivo ligado com sucesso. ${JSON.stringify(result)}`);
    }

    case "desligar_dispositivo": {
      const result = await st.turnOff(args.deviceId);
      return textResult(`Dispositivo desligado com sucesso. ${JSON.stringify(result)}`);
    }

    case "enviar_comando": {
      const result = await st.sendCommand(
        args.deviceId,
        args.capability,
        args.command,
        args.args || []
      );
      return textResult(`Comando enviado com sucesso. ${JSON.stringify(result)}`);
    }

    case "listar_comodos": {
      const rooms = await st.listRooms();
      return textResult(JSON.stringify(rooms, null, 2));
    }

    default:
      throw new Error(`Tool desconhecida: ${name}`);
  }
}

function textResult(text) {
  return {
    content: [{ type: "text", text }],
  };
}

module.exports = { TOOLS, callTool };
