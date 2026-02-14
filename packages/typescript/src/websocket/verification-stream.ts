/**
 * Verification Stream
 * @spec ADRL-0004
 *
 * WebSocket client for real-time verification updates
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import {
  VerificationRequest,
  Escrow,
  TierUpdateEvent,
  DisputeRaisedEvent,
} from '../types';

/**
 * Verification Stream Configuration
 */
export interface VerificationStreamConfig {
  wsUrl: string;
  agentId: string;
  autoReconnect?: boolean;
  reconnectionDelay?: number;
}

/**
 * Verification Stream Events
 */
export interface VerificationStreamEvents {
  'connected': () => void;
  'disconnected': () => void;
  'error': (error: Error) => void;
  'verification_submitted': (data: VerificationRequest) => void;
  'verification_approved': (data: VerificationRequest) => void;
  'verification_rejected': (data: VerificationRequest) => void;
  'tier_updated': (data: TierUpdateEvent) => void;
  'escrow_created': (data: Escrow) => void;
  'escrow_confirmed': (data: Escrow) => void;
  'escrow_completed': (data: Escrow) => void;
  'dispute_raised': (data: DisputeRaisedEvent) => void;
}

/**
 * Verification Stream
 *
 * Listens to real-time updates via WebSocket
 */
export class VerificationStream extends EventEmitter {
  private socket?: Socket;
  private config: VerificationStreamConfig;
  private isConnected: boolean = false;

  constructor(config: VerificationStreamConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      throw new Error('Already connected');
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.config.wsUrl, {
          autoConnect: true,
          reconnection: this.config.autoReconnect ?? true,
          reconnectionDelay: this.config.reconnectionDelay ?? 1000,
          query: {
            agentId: this.config.agentId,
          },
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          this.emit('connected');
          resolve();
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          this.emit('disconnected');
        });

        this.socket.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        // Listen to verification events
        this.socket.on('verification_submitted', (data) => {
          this.emit('verification_submitted', data);
        });

        this.socket.on('verification_approved', (data) => {
          this.emit('verification_approved', data);
        });

        this.socket.on('verification_rejected', (data) => {
          this.emit('verification_rejected', data);
        });

        this.socket.on('tier_updated', (data) => {
          this.emit('tier_updated', data);
        });

        // Listen to escrow events
        this.socket.on('escrow_created', (data) => {
          this.emit('escrow_created', data);
        });

        this.socket.on('escrow_confirmed', (data) => {
          this.emit('escrow_confirmed', data);
        });

        this.socket.on('escrow_completed', (data) => {
          this.emit('escrow_completed', data);
        });

        this.socket.on('dispute_raised', (data) => {
          this.emit('dispute_raised', data);
        });

        // Set timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
      this.isConnected = false;
    }
  }

  /**
   * Join a room for specific agent
   * @param agentId Agent ID
   */
  joinAgentRoom(agentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_agent_room', { agentId });
    }
  }

  /**
   * Leave a room
   * @param agentId Agent ID
   */
  leaveAgentRoom(agentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_agent_room', { agentId });
    }
  }

  /**
   * Subscribe to verification events
   * @param agentId Agent ID
   */
  subscribeToVerifications(agentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_verifications', { agentId });
    }
  }

  /**
   * Unsubscribe from verification events
   * @param agentId Agent ID
   */
  unsubscribeFromVerifications(agentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe_verifications', { agentId });
    }
  }

  /**
   * Subscribe to escrow events
   * @param agentId Agent ID
   */
  subscribeToEscrows(agentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_escrows', { agentId });
    }
  }

  /**
   * Unsubscribe from escrow events
   * @param agentId Agent ID
   */
  unsubscribeFromEscrows(agentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe_escrows', { agentId });
    }
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

