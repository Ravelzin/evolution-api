import { RequestHandler } from 'express';
import { WhatsmeowService } from './whatsmeow.service';

export class WhatsmeowController {
  private whatsmeowService: WhatsmeowService;
  private instances: Map<string, WhatsmeowService> = new Map();

  constructor() {
    this.whatsmeowService = new WhatsmeowService();
  }

  /**
   * Create a new WhatsApp instance
   */
  createInstance: RequestHandler = async (req, res) => {
    try {
      const { instanceId } = req.params;
      
      if (!instanceId) {
        return res.status(400).json({ error: 'Instance ID is required' });
      }

      // Check if instance already exists
      if (this.instances.has(instanceId)) {
        return res.status(409).json({ error: 'Instance already exists' });
      }

      // Create new service instance
      const service = new WhatsmeowService();
      await service.initialize();
      
      const result = await service.createClient(instanceId);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      this.instances.set(instanceId, service);

      return res.status(201).json({
        success: true,
        instance: {
          instanceId,
          status: 'created',
        },
      });
    } catch (error) {
      console.error('Error creating instance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Connect to WhatsApp
   */
  connect: RequestHandler = async (req, res) => {
    try {
      const { instanceId } = req.params;
      const service = this.instances.get(instanceId);

      if (!service) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      const result = await service.connect(instanceId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      if (result.needsQR) {
        return res.json({
          success: true,
          needsQR: true,
          message: 'QR code required for pairing',
        });
      }

      return res.json({
        success: true,
        connected: true,
        message: 'Connected successfully',
      });
    } catch (error) {
      console.error('Error connecting:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get QR code for pairing
   */
  getQRCode: RequestHandler = async (req, res) => {
    try {
      const { instanceId } = req.params;
      const service = this.instances.get(instanceId);

      if (!service) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      // Set up SSE for real-time QR code updates
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const result = await service.getQRCode(instanceId, (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        
        // Close connection if successfully connected
        if (event.type === 'connection' && event.connected) {
          res.end();
        }
      });

      if (!result.success) {
        res.write(`data: ${JSON.stringify({ error: result.error })}\n\n`);
        res.end();
        return;
      }

      // Keep connection alive
      const keepAlive = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
      }, 30000);

      req.on('close', () => {
        clearInterval(keepAlive);
      });
    } catch (error) {
      console.error('Error getting QR code:', error);
      res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
      res.end();
    }
  };

  /**
   * Get instance status
   */
  getStatus: RequestHandler = async (req, res) => {
    try {
      const { instanceId } = req.params;
      const service = this.instances.get(instanceId);

      if (!service) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      const connectionState = await service.getConnectionState(instanceId);

      if (connectionState.error) {
        return res.status(500).json({ error: connectionState.error });
      }

      return res.json({
        success: true,
        instance: {
          instanceId,
          connected: connectionState.connected,
          isLoggedIn: connectionState.isLoggedIn,
          pushName: connectionState.pushName,
          jid: connectionState.jid,
          businessId: connectionState.businessId,
        },
      });
    } catch (error) {
      console.error('Error getting status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Send a text message
   */
  sendMessage: RequestHandler = async (req, res) => {
    try {
      const { instanceId } = req.params;
      const { number, message } = req.body;

      if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
      }

      const service = this.instances.get(instanceId);

      if (!service) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      // Format WhatsApp JID
      const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;

      const result = await service.sendMessage(instanceId, jid, message);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      return res.json({
        success: true,
        message: {
          id: result.messageId,
          timestamp: result.timestamp,
          to: jid,
          text: message,
        },
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Disconnect instance
   */
  disconnect: RequestHandler = async (req, res) => {
    try {
      const { instanceId } = req.params;
      const service = this.instances.get(instanceId);

      if (!service) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      const result = await service.disconnect(instanceId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      return res.json({
        success: true,
        message: 'Disconnected successfully',
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Logout and delete instance
   */
  logout: RequestHandler = async (req, res) => {
    try {
      const { instanceId } = req.params;
      const service = this.instances.get(instanceId);

      if (!service) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      const result = await service.logout(instanceId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // Clean up service
      await service.cleanup();
      this.instances.delete(instanceId);

      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Error logging out:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * List all instances
   */
  listInstances: RequestHandler = async (req, res) => {
    try {
      const instances = [];

      for (const [instanceId, service] of this.instances.entries()) {
        const connectionState = await service.getConnectionState(instanceId);
        
        instances.push({
          instanceId,
          connected: connectionState.connected,
          isLoggedIn: connectionState.isLoggedIn,
          pushName: connectionState.pushName,
          jid: connectionState.jid,
        });
      }

      return res.json({
        success: true,
        instances,
      });
    } catch (error) {
      console.error('Error listing instances:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Delete instance
   */
  deleteInstance: RequestHandler = async (req, res) => {
    try {
      const { instanceId } = req.params;
      const service = this.instances.get(instanceId);

      if (!service) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      // Logout first, then cleanup
      try {
        await service.logout(instanceId);
      } catch (error) {
        // Continue with cleanup even if logout fails
        console.warn('Logout failed during instance deletion:', error);
      }

      await service.cleanup();
      this.instances.delete(instanceId);

      return res.json({
        success: true,
        message: 'Instance deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting instance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Cleanup all instances
   */
  async cleanup(): Promise<void> {
    for (const [instanceId, service] of this.instances.entries()) {
      try {
        await service.cleanup();
      } catch (error) {
        console.error(`Error cleaning up instance ${instanceId}:`, error);
      }
    }
    this.instances.clear();
  }
}