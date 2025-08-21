import { promises as fs } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';
import { whatsmeowConfig } from './whatsmeow.config';

interface WhatsmeowEvent {
  type: string;
  [key: string]: any;
}

interface ConnectionState {
  connected: boolean;
  isLoggedIn: boolean;
  pushName?: string;
  jid?: string;
  businessId?: string;
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  timestamp?: number;
  error?: string;
}

export class WhatsmeowService extends EventEmitter {
  private wasm: any = null;
  private isInitialized = false;
  private wasmModule: WebAssembly.Module | null = null;
  private wasmInstance: WebAssembly.Instance | null = null;
  private go: any = null;

  constructor() {
    super();
  }

  /**
   * Initialize WASM module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!whatsmeowConfig.wasm.enabled) {
      throw new Error('Whatsmeow WASM is disabled in configuration');
    }

    try {
      console.log('🔄 Initializing Whatsmeow WASM module...');

      // Load Go WASM polyfill for Node.js
      const polyfillPath = join(__dirname, 'wasm', 'go-wasm-polyfill.js');
      
      if (await this.fileExists(polyfillPath)) {
        const GoClass = require(polyfillPath);
        this.go = new GoClass();
      } else {
        // Fallback to direct wasm_exec.js loading
        const wasmExecPath = join(__dirname, 'wasm', 'wasm_exec.js');
        require(wasmExecPath);
        this.go = new (global as any).Go();
      }
      
      // Load WASM module
      const wasmPath = join(__dirname, 'wasm', 'whatsmeow.wasm');
      
      if (!(await this.fileExists(wasmPath))) {
        throw new Error(`WASM file not found at ${wasmPath}. Run the installation script first.`);
      }

      console.log(`📁 Loading WASM from: ${wasmPath}`);
      const wasmBytes = await fs.readFile(wasmPath);
      
      this.wasmModule = await WebAssembly.compile(wasmBytes);
      this.wasmInstance = await WebAssembly.instantiate(this.wasmModule, this.go.importObject);
      
      // Run the WASM module in background
      this.runWasmInBackground();
      
      // Wait a bit for WASM to initialize
      await this.waitForWasmReady();
      
      // Set up global WASM functions
      this.wasm = {
        createClient: (global as any).whatsmeowCreateClient,
        connect: (global as any).whatsmeowConnect,
        disconnect: (global as any).whatsmeowDisconnect,
        sendMessage: (global as any).whatsmeowSendMessage,
        getQRCode: (global as any).whatsmeowGetQRCode,
        getConnectionState: (global as any).whatsmeowGetConnectionState,
        logout: (global as any).whatsmeowLogout,
        isConnected: (global as any).whatsmeowIsConnected,
      };

      // Verify WASM functions are available
      if (!this.wasm.createClient) {
        throw new Error('WASM functions not properly loaded');
      }

      this.isInitialized = true;
      console.log('✅ Whatsmeow WASM module initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Whatsmeow WASM:', error.message);
      throw new Error(`Failed to initialize Whatsmeow WASM: ${error.message}`);
    }
  }

  /**
   * Run WASM in background to avoid blocking
   */
  private runWasmInBackground(): void {
    setImmediate(() => {
      try {
        this.go.run(this.wasmInstance);
      } catch (error) {
        console.error('Error running WASM:', error);
      }
    });
  }

  /**
   * Wait for WASM to be ready
   */
  private async waitForWasmReady(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if ((global as any).whatsmeowCreateClient) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('WASM initialization timeout'));
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new WhatsApp client instance
   */
  async createClient(instanceId: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();
    
    try {
      const result = this.wasm.createClient(instanceId);
      if (result.error) {
        throw new Error(result.error);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect to WhatsApp
   */
  async connect(instanceId: string): Promise<{ success: boolean; needsQR?: boolean; error?: string }> {
    await this.ensureInitialized();
    
    try {
      const result = this.wasm.connect(instanceId);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      if (result.needsQR) {
        return { success: true, needsQR: true };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get QR code for pairing
   */
  async getQRCode(instanceId: string, callback: (event: WhatsmeowEvent) => void): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();
    
    try {
      // Set up event handler for this instance
      this.setupEventHandler(instanceId, callback);
      
      const result = this.wasm.getQRCode(instanceId);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from WhatsApp
   */
  async disconnect(instanceId: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();
    
    try {
      const result = this.wasm.disconnect(instanceId);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(instanceId: string, to: string, message: string): Promise<SendMessageResult> {
    await this.ensureInitialized();
    
    try {
      const result = this.wasm.sendMessage(instanceId, to, message);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      return {
        success: true,
        messageId: result.messageId,
        timestamp: result.timestamp,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get connection state
   */
  async getConnectionState(instanceId: string): Promise<ConnectionState & { error?: string }> {
    await this.ensureInitialized();
    
    try {
      const result = this.wasm.getConnectionState(instanceId);
      
      if (result.error) {
        return { connected: false, isLoggedIn: false, error: result.error };
      }
      
      return {
        connected: result.connected,
        isLoggedIn: result.isLoggedIn,
        pushName: result.pushName,
        jid: result.jid,
        businessId: result.businessId,
      };
    } catch (error) {
      return { connected: false, isLoggedIn: false, error: error.message };
    }
  }

  /**
   * Check if connected
   */
  async isConnected(instanceId: string): Promise<{ connected: boolean; error?: string }> {
    await this.ensureInitialized();
    
    try {
      const result = this.wasm.isConnected(instanceId);
      
      if (result.error) {
        return { connected: false, error: result.error };
      }
      
      return { connected: result.connected };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Logout and delete session
   */
  async logout(instanceId: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();
    
    try {
      const result = this.wasm.logout(instanceId);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up event handler for a specific instance
   */
  private setupEventHandler(instanceId: string, callback: (event: WhatsmeowEvent) => void): void {
    // This would need to be implemented in the WASM side
    // For now, we'll use a simple event emitter approach
    this.on(`event:${instanceId}`, callback);
  }

  /**
   * Ensure WASM module is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.wasmInstance) {
      // Clean up WASM instance if needed
      this.wasmInstance = null;
    }
    
    if (this.wasmModule) {
      this.wasmModule = null;
    }
    
    this.wasm = null;
    this.isInitialized = false;
    this.removeAllListeners();
  }
}