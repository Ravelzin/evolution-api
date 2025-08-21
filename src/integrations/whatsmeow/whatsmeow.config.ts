import { join } from 'path';

export interface WhatsmeowConfig {
  wasm: {
    enabled: boolean;
    wasmPath: string;
    wasmExecPath: string;
    maxInstances: number;
    timeout: number;
  };
  instance: {
    defaultTimeout: number;
    maxRetries: number;
    qrCodeTimeout: number;
  };
}

export const whatsmeowConfig: WhatsmeowConfig = {
  wasm: {
    enabled: process.env.WHATSMEOW_WASM_ENABLED === 'true' || true,
    wasmPath: join(__dirname, 'wasm', 'whatsmeow.wasm'),
    wasmExecPath: join(__dirname, 'wasm', 'wasm_exec.js'),
    maxInstances: parseInt(process.env.WHATSMEOW_MAX_INSTANCES || '10'),
    timeout: parseInt(process.env.WHATSMEOW_TIMEOUT || '30000'),
  },
  instance: {
    defaultTimeout: parseInt(process.env.WHATSMEOW_DEFAULT_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.WHATSMEOW_MAX_RETRIES || '3'),
    qrCodeTimeout: parseInt(process.env.WHATSMEOW_QR_TIMEOUT || '60000'),
  },
};

export const validateConfig = (): void => {
  if (whatsmeowConfig.wasm.enabled) {
    console.log('✅ Whatsmeow WASM integration enabled');
    console.log(`   WASM Path: ${whatsmeowConfig.wasm.wasmPath}`);
    console.log(`   Exec Path: ${whatsmeowConfig.wasm.wasmExecPath}`);
    console.log(`   Max Instances: ${whatsmeowConfig.wasm.maxInstances}`);
  } else {
    console.log('❌ Whatsmeow WASM integration disabled');
  }
};