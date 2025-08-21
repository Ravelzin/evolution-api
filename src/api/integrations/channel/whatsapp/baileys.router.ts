import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import { HttpStatus } from '@api/routes/index.router';
import { whatsmeowController } from '@api/server.module';
import { instanceSchema } from '@validate/instance.schema';
import { RequestHandler, Router } from 'express';

export class BaileysRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .post(this.routerPath('onWhatsapp'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.onWhatsapp(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('profilePictureUrl'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.profilePictureUrl(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('assertSessions'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.assertSessions(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('createParticipantNodes'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.createParticipantNodes(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('getUSyncDevices'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.getUSyncDevices(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('generateMessageTag'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.generateMessageTag(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('sendNode'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.sendNode(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('signalRepositoryDecryptMessage'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.signalRepositoryDecryptMessage(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('getAuthState'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => whatsmeowController.getAuthState(instance),
        });

        res.status(HttpStatus.OK).json(response);
      });
  }

  public readonly router: Router = Router();
}
