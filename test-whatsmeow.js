/**
 * Script de teste para a integração Whatsmeow WASM
 * 
 * Execute: node test-whatsmeow.js
 */

const axios = require('axios');
const EventSource = require('eventsource');

const BASE_URL = 'http://localhost:8080'; // Adjust to your Evolution API URL
const INSTANCE_ID = 'test-wasm-instance';
const TEST_NUMBER = '5511999999999'; // Change to a real number for testing

class WhatsmeowTester {
  constructor() {
    this.baseURL = BASE_URL;
    this.instanceId = INSTANCE_ID;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request(method, path, data = null) {
    try {
      const url = `${this.baseURL}/whatsmeow${path}`;
      console.log(`📡 ${method.toUpperCase()} ${url}`);
      
      const config = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      console.log(`✅ Response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Error:`, error.response?.data || error.message);
      throw error;
    }
  }

  async testCreateInstance() {
    console.log('\n=== 1. Creating Instance ===');
    return await this.request('POST', `/instance/${this.instanceId}`);
  }

  async testConnect() {
    console.log('\n=== 2. Connecting ===');
    return await this.request('POST', `/instance/${this.instanceId}/connect`);
  }

  async testQRCode() {
    console.log('\n=== 3. Getting QR Code (SSE) ===');
    
    return new Promise((resolve, reject) => {
      const url = `${this.baseURL}/whatsmeow/instance/${this.instanceId}/qrcode`;
      console.log(`📡 SSE ${url}`);
      
      const eventSource = new EventSource(url);
      let timeout;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 SSE Event:', data);

        if (data.type === 'qr') {
          console.log('📱 QR Code received! Scan it with WhatsApp.');
          console.log('🔗 QR Code:', data.code.substring(0, 50) + '...');
        } else if (data.type === 'connection' && data.connected) {
          console.log('✅ Connected successfully!');
          eventSource.close();
          clearTimeout(timeout);
          resolve(data);
        } else if (data.error) {
          console.error('❌ SSE Error:', data.error);
          eventSource.close();
          clearTimeout(timeout);
          reject(new Error(data.error));
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE Connection error:', error);
        eventSource.close();
        clearTimeout(timeout);
        reject(error);
      };

      // Timeout after 2 minutes
      timeout = setTimeout(() => {
        console.log('⏰ QR Code timeout (2 minutes)');
        eventSource.close();
        resolve({ timeout: true });
      }, 120000);
    });
  }

  async testStatus() {
    console.log('\n=== 4. Checking Status ===');
    return await this.request('GET', `/instance/${this.instanceId}/status`);
  }

  async testSendMessage() {
    console.log('\n=== 5. Sending Test Message ===');
    
    const messageData = {
      number: TEST_NUMBER,
      message: `🤖 Test message from Whatsmeow WASM at ${new Date().toLocaleString()}`
    };
    
    return await this.request('POST', `/instance/${this.instanceId}/send/text`, messageData);
  }

  async testListInstances() {
    console.log('\n=== 6. Listing Instances ===');
    return await this.request('GET', '/instances');
  }

  async testDisconnect() {
    console.log('\n=== 7. Disconnecting ===');
    return await this.request('POST', `/instance/${this.instanceId}/disconnect`);
  }

  async testLogout() {
    console.log('\n=== 8. Logging Out ===');
    return await this.request('POST', `/instance/${this.instanceId}/logout`);
  }

  async runFullTest() {
    console.log('🚀 Starting Whatsmeow WASM Integration Test');
    console.log(`📱 Instance ID: ${this.instanceId}`);
    console.log(`🌐 Base URL: ${this.baseURL}`);
    console.log(`📞 Test Number: ${TEST_NUMBER}`);

    try {
      // 1. Create instance
      await this.testCreateInstance();
      await this.delay(1000);

      // 2. Try to connect (will probably need QR)
      const connectResult = await this.testConnect();
      
      if (connectResult.needsQR) {
        // 3. Get QR code if needed
        console.log('\n⏳ Waiting for QR code scan...');
        const qrResult = await this.testQRCode();
        
        if (qrResult.timeout) {
          console.log('❌ Test stopped due to QR code timeout');
          return;
        }
      }

      await this.delay(2000);

      // 4. Check status
      await this.testStatus();
      await this.delay(1000);

      // 5. Send test message (if number provided)
      if (TEST_NUMBER !== '5511999999999') {
        await this.testSendMessage();
        await this.delay(1000);
      } else {
        console.log('⚠️  Skipping message test (update TEST_NUMBER)');
      }

      // 6. List instances
      await this.testListInstances();
      await this.delay(1000);

      // 7. Disconnect
      await this.testDisconnect();
      await this.delay(1000);

      // 8. Cleanup
      await this.testLogout();

      console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
      console.error('\n💥 Test failed:', error.message);
      
      // Try to cleanup on error
      try {
        await this.testLogout();
      } catch (cleanupError) {
        console.error('⚠️  Cleanup failed:', cleanupError.message);
      }
    }
  }

  async runQuickTest() {
    console.log('⚡ Running Quick Test (Status Check Only)');
    
    try {
      await this.testListInstances();
      console.log('✅ Quick test passed - API is responding');
    } catch (error) {
      console.error('❌ Quick test failed:', error.message);
    }
  }
}

// Run tests based on command line arguments
async function main() {
  const tester = new WhatsmeowTester();
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    await tester.runQuickTest();
  } else if (args.includes('--help')) {
    console.log(`
Whatsmeow WASM Integration Tester

Usage:
  node test-whatsmeow.js           # Run full test suite
  node test-whatsmeow.js --quick   # Run quick status check
  node test-whatsmeow.js --help    # Show this help

Configuration:
  BASE_URL: ${BASE_URL}
  INSTANCE_ID: ${INSTANCE_ID}
  TEST_NUMBER: ${TEST_NUMBER}

Before running:
1. Make sure Evolution API is running
2. Update TEST_NUMBER to a real WhatsApp number
3. Have your phone ready to scan QR code
`);
  } else {
    await tester.runFullTest();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle interrupt signal
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}