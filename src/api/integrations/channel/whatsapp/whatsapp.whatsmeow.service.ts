import { getCollectionsDto } from '@api/dto/business.dto';
import { OfferCallDto } from '@api/dto/call.dto';
import {
  ArchiveChatDto,
  BlockUserDto,
  DeleteMessage,
  getBase64FromMediaMessageDto,
  LastMessage,
  MarkChatUnreadDto,
  NumberBusiness,
  OnWhatsAppDto,
  PrivacySettingDto,
  ReadMessageDto,
  SendPresenceDto,
  UpdateMessageDto,
  WhatsAppNumberDto,
} from '@api/dto/chat.dto';
import {
  AcceptGroupInvite,
  CreateGroupDto,
  GetParticipant,
  GroupDescriptionDto,
  GroupInvite,
  GroupJid,
  GroupPictureDto,
  GroupSendInvite,
  GroupSubjectDto,
  GroupToggleEphemeralDto,
  GroupUpdateParticipantDto,
  GroupUpdateSettingDto,
} from '@api/dto/group.dto';
import { InstanceDto, SetPresenceDto } from '@api/dto/instance.dto';
import { HandleLabelDto, LabelDto } from '@api/dto/label.dto';
import {
  Button,
  ContactMessage,
  MediaMessage,
  SendAudioDto,
  SendButtonsDto,
  SendContactDto,
  SendListDto,
  SendLocationDto,
  SendMediaDto,
  SendPollDto,
  SendPtvDto,
  SendReactionDto,
  SendStatusDto,
  SendStickerDto,
  SendTextDto,
  StatusMessage,
} from '@api/dto/sendMessage.dto';
import { PrismaRepository } from '@api/repository/repository.service';
import { CacheService } from '@api/services/cache.service';
import { ChannelStartupService } from '@api/services/channel.service';
import { Events, wa } from '@api/types/wa.types';
import { ConfigService } from '@config/env.config';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@exceptions';
import { Instance, Message } from '@prisma/client';
import { WhatsmeowService } from '@api/integrations/whatsmeow/whatsmeow.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class WhatsmeowStartupService extends ChannelStartupService {
  private whatsmeowService: WhatsmeowService;

  constructor(
    public readonly configService: ConfigService,
    public readonly eventEmitter: EventEmitter2,
    public readonly prismaRepository: PrismaRepository,
    public readonly cache: CacheService,
    public readonly chatwootCache: CacheService,
  ) {
    super(configService, eventEmitter, prismaRepository, chatwootCache);
    this.instance.qrcode = { count: 0 };
    this.whatsmeowService = new WhatsmeowService();
  }

  public stateConnection: wa.StateConnection = { state: 'close' };
  public phoneNumber: string;

  public get connectionStatus() {
    return this.stateConnection;
  }

  // Initialize WASM and create instance
  public async connectToWhatsapp(instance?: InstanceDto): Promise<void> {
    try {
      // Initialize WASM service
      await this.whatsmeowService.initialize();

      // Create client instance
      const createResult = await this.whatsmeowService.createClient(this.instance.name);
      
      if (!createResult.success) {
        throw new Error(`Failed to create client: ${createResult.error}`);
      }

      // Try to connect
      const connectResult = await this.whatsmeowService.connect(this.instance.name);
      
      if (connectResult.needsQR) {
        // Set up QR code handling
        await this.handleQRCodeGeneration();
      } else if (connectResult.success) {
        // Already connected
        this.stateConnection.state = 'open';
        await this.handleConnectionSuccess();
      }

    } catch (error) {
      console.error('WhatsApp connection error:', error);
      this.stateConnection.state = 'close';
      throw error;
    }
  }

  private async handleQRCodeGeneration(): Promise<void> {
    this.stateConnection.state = 'connecting';
    
    const result = await this.whatsmeowService.getQRCode(this.instance.name, (event) => {
      if (event.type === 'qr') {
        // Update QR code
        this.instance.qrcode.code = event.code;
        this.instance.qrcode.count++;
        
        // Emit QR code event
        this.eventEmitter.emit('qrcode.updated', {
          instance: this.instance,
          qrcode: this.instance.qrcode,
        });

      } else if (event.type === 'connection' && event.connected) {
        // Connected successfully
        this.stateConnection.state = 'open';
        this.handleConnectionSuccess();
      }
    });

    if (!result.success) {
      throw new Error(`QR generation failed: ${result.error}`);
    }
  }

  private async handleConnectionSuccess(): Promise<void> {
    // Get connection state
    const state = await this.whatsmeowService.getConnectionState(this.instance.name);
    
    if (state.jid) {
      this.phoneNumber = state.jid.split('@')[0];
      this.instance.wuid = state.jid;
    }

    // Update instance in database
    await this.prismaRepository.instance.update({
      where: { name: this.instance.name },
      data: {
        status: 'open',
        serverUrl: null,
        apikey: null,
      },
    });

    // Emit connection event
    this.eventEmitter.emit('connection.update', {
      instance: this.instance,
      state: 'open',
    });
  }

  // Send text message
  public async textMessage(data: SendTextDto): Promise<wa.MessageSendResult> {
    try {
      const jid = this.createJid(data.number);
      const result = await this.whatsmeowService.sendMessage(this.instance.name, jid, data.text);

      if (!result.success) {
        throw new Error(`Message send failed: ${result.error}`);
      }

      return {
        key: {
          id: result.messageId,
          remoteJid: jid,
          fromMe: true,
        },
        message: {
          conversation: data.text,
        },
        messageTimestamp: result.timestamp,
        status: 'SUCCESS',
      };
    } catch (error) {
      console.error('Send message error:', error);
      throw new BadRequestException(error.message);
    }
  }

  // Media message (placeholder - needs implementation)
  public async mediaMessage(data: SendMediaDto): Promise<wa.MessageSendResult> {
    throw new Error('Media messages not yet implemented in WASM version');
  }

  // Audio message (placeholder)
  public async audioWhatsapp(data: SendAudioDto): Promise<wa.MessageSendResult> {
    throw new Error('Audio messages not yet implemented in WASM version');
  }

  // Button message (placeholder)
  public async buttonMessage(data: SendButtonsDto): Promise<wa.MessageSendResult> {
    throw new Error('Button messages not yet implemented in WASM version');
  }

  // List message (placeholder)
  public async listMessage(data: SendListDto): Promise<wa.MessageSendResult> {
    throw new Error('List messages not yet implemented in WASM version');
  }

  // Contact message (placeholder)
  public async contactMessage(data: SendContactDto): Promise<wa.MessageSendResult> {
    throw new Error('Contact messages not yet implemented in WASM version');
  }

  // Location message (placeholder)
  public async locationMessage(data: SendLocationDto): Promise<wa.MessageSendResult> {
    throw new Error('Location messages not yet implemented in WASM version');
  }

  // Reaction message (placeholder)
  public async reactionMessage(data: SendReactionDto): Promise<wa.MessageSendResult> {
    throw new Error('Reaction messages not yet implemented in WASM version');
  }

  // Get instance info
  public async instanceInfo(instanceName?: string): Promise<wa.InstanceInfo> {
    const state = await this.whatsmeowService.getConnectionState(this.instance.name);
    
    return {
      instanceName: this.instance.name,
      status: state.connected ? 'open' : 'close',
      serverUrl: null,
      apikey: null,
      owner: state.jid || '',
      profileName: state.pushName || '',
      profilePictureUrl: '',
      mobile: true,
      webhookUrl: '',
      webhookByEvents: false,
      webhookBase64: false,
      webhookEvents: [],
      rejectCall: false,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
    };
  }

  // Fetch instances
  public async fetchInstances(): Promise<wa.InstanceInfo[]> {
    return [await this.instanceInfo()];
  }

  // Disconnect
  public async logoutInstance(): Promise<void> {
    try {
      await this.whatsmeowService.logout(this.instance.name);
      this.stateConnection.state = 'close';
      
      // Update database
      await this.prismaRepository.instance.update({
        where: { name: this.instance.name },
        data: { status: 'close' },
      });

    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Helper methods
  private createJid(number: string): string {
    if (number.includes('@')) {
      return number;
    }
    return `${number}@s.whatsapp.net`;
  }

  // Check if number is on WhatsApp
  public async whatsappNumber(data: OnWhatsAppDto): Promise<wa.OnWhatsAppResponse[]> {
    // This would need to be implemented in the WASM layer
    throw new Error('WhatsApp number check not yet implemented in WASM version');
  }

  // Get profile picture
  public async profilePicture(number: string): Promise<wa.ProfilePictureResponse> {
    throw new Error('Profile picture not yet implemented in WASM version');
  }

  // Get contacts
  public async fetchContacts(): Promise<wa.ContactResponse[]> {
    throw new Error('Fetch contacts not yet implemented in WASM version');
  }

  // Get chats
  public async fetchChats(): Promise<wa.ChatResponse[]> {
    throw new Error('Fetch chats not yet implemented in WASM version');
  }

  // Send presence
  public async sendPresence(data: SendPresenceDto): Promise<void> {
    throw new Error('Send presence not yet implemented in WASM version');
  }

  // Mark as read
  public async markMessageAsRead(data: ReadMessageDto): Promise<void> {
    throw new Error('Mark as read not yet implemented in WASM version');
  }

  // Archive chat
  public async archiveChat(data: ArchiveChatDto): Promise<void> {
    throw new Error('Archive chat not yet implemented in WASM version');
  }

  // Block user
  public async blockUser(data: BlockUserDto): Promise<void> {
    throw new Error('Block user not yet implemented in WASM version');
  }

  // Group methods (placeholders)
  public async createGroup(data: CreateGroupDto): Promise<wa.GroupResponse> {
    throw new Error('Create group not yet implemented in WASM version');
  }

  public async updateGroupSubject(data: GroupSubjectDto): Promise<void> {
    throw new Error('Update group subject not yet implemented in WASM version');
  }

  public async updateGroupDescription(data: GroupDescriptionDto): Promise<void> {
    throw new Error('Update group description not yet implemented in WASM version');
  }

  public async updateGroupPicture(data: GroupPictureDto): Promise<void> {
    throw new Error('Update group picture not yet implemented in WASM version');
  }

  public async addParticipant(data: GroupUpdateParticipantDto): Promise<void> {
    throw new Error('Add participant not yet implemented in WASM version');
  }

  public async removeParticipant(data: GroupUpdateParticipantDto): Promise<void> {
    throw new Error('Remove participant not yet implemented in WASM version');
  }

  public async promoteParticipant(data: GroupUpdateParticipantDto): Promise<void> {
    throw new Error('Promote participant not yet implemented in WASM version');
  }

  public async demoteParticipant(data: GroupUpdateParticipantDto): Promise<void> {
    throw new Error('Demote participant not yet implemented in WASM version');
  }

  public async leaveGroup(groupJid: GroupJid): Promise<void> {
    throw new Error('Leave group not yet implemented in WASM version');
  }

  public async getInviteCode(groupJid: GroupJid): Promise<GroupInvite> {
    throw new Error('Get invite code not yet implemented in WASM version');
  }

  public async revokeInviteCode(groupJid: GroupJid): Promise<GroupInvite> {
    throw new Error('Revoke invite code not yet implemented in WASM version');
  }

  public async acceptInviteCode(data: AcceptGroupInvite): Promise<wa.GroupResponse> {
    throw new Error('Accept invite code not yet implemented in WASM version');
  }

  public async sendInvite(data: GroupSendInvite): Promise<wa.MessageSendResult> {
    throw new Error('Send invite not yet implemented in WASM version');
  }

  public async getParticipants(data: GetParticipant): Promise<wa.GroupParticipant[]> {
    throw new Error('Get participants not yet implemented in WASM version');
  }

  public async updateGroupSettings(data: GroupUpdateSettingDto): Promise<void> {
    throw new Error('Update group settings not yet implemented in WASM version');
  }

  public async toggleEphemeral(data: GroupToggleEphemeralDto): Promise<void> {
    throw new Error('Toggle ephemeral not yet implemented in WASM version');
  }
}