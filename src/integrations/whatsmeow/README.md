# Whatsmeow WASM Integration

Esta integração permite usar o Whatsmeow (biblioteca Go) dentro do Evolution API através de WebAssembly (WASM).

## Características

- 🚀 **Performance**: Whatsmeow compilado em WASM para máxima eficiência
- 🔄 **Multi-instância**: Suporte a múltiplas instâncias WhatsApp simultaneamente
- 📱 **QR Code**: Geração de QR code em tempo real via Server-Sent Events (SSE)
- 🔗 **API RESTful**: Interface HTTP completa para todas as operações
- ✅ **Validação**: Validação robusta de entrada com Joi
- 🛡️ **Type Safety**: TypeScript completo com interfaces bem definidas

## Instalação

### 1. Pré-requisitos

- **Go 1.19+**: Para compilar o WASM
- **Node.js 16+**: Para executar o Evolution API
- **Redis** (opcional): Para cache e persistência

### 2. Instalar Go

```bash
# Windows (via Chocolatey)
choco install golang

# macOS (via Homebrew)
brew install go

# Linux (Ubuntu/Debian)
sudo apt install golang-go
```

### 3. Executar Script de Instalação

```bash
cd evolution-api
node scripts/install-whatsmeow-wasm.js
```

### 4. Configurar Variáveis de Ambiente

```env
# .env
WHATSMEOW_WASM_ENABLED=true
WHATSMEOW_MAX_INSTANCES=10
WHATSMEOW_TIMEOUT=30000
WHATSMEOW_QR_TIMEOUT=60000
```

## Uso da API

### 1. Criar uma Instância

```bash
POST /whatsmeow/instance/my-instance
```

**Resposta:**
```json
{
  "success": true,
  "instance": {
    "instanceId": "my-instance",
    "status": "created"
  }
}
```

### 2. Conectar (se já logado)

```bash
POST /whatsmeow/instance/my-instance/connect
```

**Resposta (precisa QR):**
```json
{
  "success": true,
  "needsQR": true,
  "message": "QR code required for pairing"
}
```

### 3. Obter QR Code (SSE Stream)

```bash
GET /whatsmeow/instance/my-instance/qrcode
```

**Stream Response:**
```
data: {"type":"qr","code":"2@abc123..."}

data: {"type":"connection","connected":true}
```

### 4. Verificar Status

```bash
GET /whatsmeow/instance/my-instance/status
```

**Resposta:**
```json
{
  "success": true,
  "instance": {
    "instanceId": "my-instance",
    "connected": true,
    "isLoggedIn": true,
    "pushName": "Meu Nome",
    "jid": "5511999999999@s.whatsapp.net",
    "businessId": null
  }
}
```

### 5. Enviar Mensagem

```bash
POST /whatsmeow/instance/my-instance/send/text

{
  "number": "5511999999999",
  "message": "Olá! Esta é uma mensagem via WASM."
}
```

**Resposta:**
```json
{
  "success": true,
  "message": {
    "id": "BAE5...",
    "timestamp": 1672531200,
    "to": "5511999999999@s.whatsapp.net",
    "text": "Olá! Esta é uma mensagem via WASM."
  }
}
```

### 6. Desconectar

```bash
POST /whatsmeow/instance/my-instance/disconnect
```

### 7. Logout

```bash
POST /whatsmeow/instance/my-instance/logout
```

### 8. Listar Instâncias

```bash
GET /whatsmeow/instances
```

## Frontend Integration

### JavaScript/TypeScript

```typescript
// Criar instância
const createInstance = async (instanceId: string) => {
  const response = await fetch('/whatsmeow/instance/' + instanceId, {
    method: 'POST'
  });
  return response.json();
};

// Escutar QR Code via SSE
const listenForQRCode = (instanceId: string) => {
  const eventSource = new EventSource('/whatsmeow/instance/' + instanceId + '/qrcode');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'qr') {
      // Mostrar QR code
      displayQRCode(data.code);
    } else if (data.type === 'connection' && data.connected) {
      // Conectado com sucesso
      console.log('Conectado!');
      eventSource.close();
    }
  };
  
  return eventSource;
};

// Enviar mensagem
const sendMessage = async (instanceId: string, number: string, message: string) => {
  const response = await fetch(`/whatsmeow/instance/${instanceId}/send/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ number, message })
  });
  return response.json();
};
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface WhatsAppInstance {
  instanceId: string;
  connected: boolean;
  isLoggedIn: boolean;
}

export const useWhatsmeow = (instanceId: string) => {
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createInstance = async () => {
    setLoading(true);
    try {
      await fetch(`/whatsmeow/instance/${instanceId}`, { method: 'POST' });
      await checkStatus();
    } finally {
      setLoading(false);
    }
  };

  const connect = async () => {
    const response = await fetch(`/whatsmeow/instance/${instanceId}/connect`, {
      method: 'POST'
    });
    const data = await response.json();
    
    if (data.needsQR) {
      startQRListener();
    }
  };

  const startQRListener = () => {
    const eventSource = new EventSource(`/whatsmeow/instance/${instanceId}/qrcode`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'qr') {
        setQrCode(data.code);
      } else if (data.type === 'connection' && data.connected) {
        setQrCode(null);
        checkStatus();
        eventSource.close();
      }
    };
  };

  const checkStatus = async () => {
    const response = await fetch(`/whatsmeow/instance/${instanceId}/status`);
    const data = await response.json();
    setInstance(data.instance);
  };

  const sendMessage = async (number: string, message: string) => {
    const response = await fetch(`/whatsmeow/instance/${instanceId}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, message })
    });
    return response.json();
  };

  useEffect(() => {
    checkStatus();
  }, [instanceId]);

  return {
    instance,
    qrCode,
    loading,
    createInstance,
    connect,
    sendMessage,
    checkStatus
  };
};
```

## Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Evolution API  │    │   Whatsmeow     │
│   (React/JS)    │    │   (Node.js/TS)   │    │   (Go → WASM)   │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • QR Display    │◄──►│ • REST API       │◄──►│ • WhatsApp      │
│ • Send Messages │    │ • SSE Events     │    │   Protocol      │
│ • Status Check  │    │ • WASM Runtime   │    │ • Message       │
│ • Multi-instance│    │ • Validation     │    │   Handling      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Estrutura de Arquivos

```
src/integrations/whatsmeow/
├── whatsmeow.service.ts     # Serviço principal WASM
├── whatsmeow.controller.ts  # Controller HTTP
├── whatsmeow.router.ts      # Rotas Express
├── whatsmeow.dto.ts         # Interfaces TypeScript
├── whatsmeow.schema.ts      # Validação Joi
├── whatsmeow.config.ts      # Configurações
├── README.md                # Esta documentação
└── wasm/
    ├── whatsmeow.wasm       # Módulo WASM compilado
    ├── wasm_exec.js         # Runtime Go WASM
    └── go-wasm-polyfill.js  # Polyfill Node.js
```

## Troubleshooting

### WASM não carrega

```
Error: WASM file not found at .../whatsmeow.wasm
```

**Solução:** Execute o script de instalação:
```bash
node scripts/install-whatsmeow-wasm.js
```

### Go não encontrado

```
Error: go: command not found
```

**Solução:** Instale Go e adicione ao PATH:
```bash
export PATH=$PATH:/usr/local/go/bin
```

### Timeout de QR Code

```
Error: WASM initialization timeout
```

**Solução:** Aumente o timeout:
```env
WHATSMEOW_QR_TIMEOUT=120000
```

### Múltiplas instâncias falham

```
Error: Maximum instances exceeded
```

**Solução:** Aumente o limite:
```env
WHATSMEOW_MAX_INSTANCES=20
```

## Limitações Atuais

- ✅ **Mensagens de texto**: Suportado
- ⏳ **Mensagens de mídia**: Em desenvolvimento
- ⏳ **Grupos**: Em desenvolvimento
- ⏳ **Status/Stories**: Em desenvolvimento
- ⏳ **Chamadas**: Em desenvolvimento

## Performance

- **Inicialização**: ~2-5 segundos (primeira vez)
- **Envio de mensagem**: ~100-500ms
- **Memory usage**: ~50-100MB por instância
- **Concurrent instances**: Até 10+ dependendo do hardware

## Desenvolvimento

### Build Manual do WASM

```bash
cd whatsmeow
./build-wasm.ps1  # Windows
./build-wasm.sh   # Linux/macOS
```

### Debug Mode

```env
DEBUG=whatsmeow:*
NODE_ENV=development
```

### Logs

```bash
tail -f logs/whatsmeow.log
```

## Contribuição

1. Fork o projeto
2. Crie sua feature branch: `git checkout -b my-new-feature`
3. Commit suas mudanças: `git commit -am 'Add some feature'`
4. Push para a branch: `git push origin my-new-feature`
5. Submeta um Pull Request

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.