import { Router } from 'express';
import { WhatsmeowController } from './whatsmeow.controller';
import { 
  validateCreateInstance, 
  validateInstanceId, 
  validateSendMessage 
} from './whatsmeow.schema';

const whatsmeowRouter = Router();
const whatsmeowController = new WhatsmeowController();

// Instance management routes
whatsmeowRouter.post('/instance/:instanceId', validateCreateInstance, whatsmeowController.createInstance);
whatsmeowRouter.delete('/instance/:instanceId', validateInstanceId, whatsmeowController.deleteInstance);
whatsmeowRouter.get('/instances', whatsmeowController.listInstances);

// Connection routes
whatsmeowRouter.post('/instance/:instanceId/connect', validateInstanceId, whatsmeowController.connect);
whatsmeowRouter.post('/instance/:instanceId/disconnect', validateInstanceId, whatsmeowController.disconnect);
whatsmeowRouter.post('/instance/:instanceId/logout', validateInstanceId, whatsmeowController.logout);

// Status and QR code routes
whatsmeowRouter.get('/instance/:instanceId/status', validateInstanceId, whatsmeowController.getStatus);
whatsmeowRouter.get('/instance/:instanceId/qrcode', validateInstanceId, whatsmeowController.getQRCode);

// Message sending routes
whatsmeowRouter.post('/instance/:instanceId/send/text', validateInstanceId, validateSendMessage, whatsmeowController.sendMessage);

export { whatsmeowRouter, whatsmeowController };