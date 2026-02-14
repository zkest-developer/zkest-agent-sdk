/**
 * Auto Approver
 * @spec ADRL-0004
 *
 * Automatically approves verified results
 */

import { ethers } from 'ethers';
import { ResultValidator } from './result-validator';
import { VerificationStream } from '../websocket/verification-stream';
import { EscrowClient } from '../escrow/escrow-client';
import { ValidationRule } from './result-validator';
import {
  SDKConfig,
  VerificationRequest,
  VerificationResult,
} from '../types';

/**
 * Auto Approver Configuration
 */
export interface AutoApproverConfig extends SDKConfig {
  autoApproveThreshold?: number;
  autoRejectThreshold?: number;
  maxPendingApprovals?: number;
}

/**
 * Approval callback
 */
export type ApprovalCallback = (task: VerificationRequest) => Promise<boolean>;

/**
 * Auto Approver
 *
 * Automatically listens for verification completion and approves/rejects results
 */
export class AutoApprover {
  private validator: ResultValidator;
  private stream?: VerificationStream;
  private escrowClient: EscrowClient;
  private wallet: ethers.Wallet;
  private config: AutoApproverConfig;
  private callbacks: Map<string, ApprovalCallback> = new Map();
  private isRunning: boolean = false;
  private token?: string;

  constructor(config: AutoApproverConfig) {
    this.config = config;
    this.wallet = new ethers.Wallet(config.privateKey);
    this.validator = new ResultValidator();
    this.escrowClient = new EscrowClient({ apiUrl: config.apiUrl });

    if (config.wsUrl) {
      this.stream = new VerificationStream({
        wsUrl: config.wsUrl,
        agentId: config.agentId,
      });

      this.stream.on('verification_approved', (data) => {
        this.handleVerificationApproved(data);
      });
    }
  }

  /**
   * Start the auto approver
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Auto approver is already running');
    }

    this.isRunning = true;

    // Authenticate and get token
    await this.authenticate();

    // Connect to WebSocket
    if (this.stream) {
      await this.stream.connect();
    }
  }

  /**
   * Stop the auto approver
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.stream) {
      await this.stream.disconnect();
    }
  }

  /**
   * Register a callback for a specific skill
   * @param skill Skill name
   * @param callback Approval callback
   */
  registerCallback(skill: string, callback: ApprovalCallback): void {
    this.callbacks.set(skill.toLowerCase(), callback);
  }

  /**
   * Unregister a callback
   * @param skill Skill name
   */
  unregisterCallback(skill: string): void {
    this.callbacks.delete(skill.toLowerCase());
  }

  /**
   * Validate a result
   * @param task Task or escrow
   * @returns Validation result
   */
  async validateResult(task: Record<string, unknown>): Promise<VerificationResult> {
    return await this.validator.validate(task);
  }

  /**
   * Approve a task
   * @param taskId Task ID
   */
  async approve(taskId: string): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    await this.escrowClient.confirmCompletion(taskId, {}, this.token);
  }

  /**
   * Reject a task
   * @param taskId Task ID
   * @param reason Rejection reason
   */
  async reject(taskId: string, reason: string): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    // In a real implementation, this would call a rejection endpoint
    console.log(`Rejecting task ${taskId}: ${reason}`);
  }

  /**
   * Handle verification approved event
   * @param data Verification data
   */
  private async handleVerificationApproved(data: VerificationRequest): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const result = await this.validateResult(data as unknown as Record<string, unknown>);

      if (result.valid) {
        await this.approve(data.id);
      } else {
        await this.reject(data.id, result.feedback ?? 'Validation failed');
      }
    } catch (error) {
      console.error('Error handling verification approved:', error);
    }
  }

  /**
   * Authenticate with the API
   */
  private async authenticate(): Promise<void> {
    // Sign a message to prove identity
    const message = `Authenticate as agent ${this.config.agentId} at ${Date.now()}`;
    const signature = await this.wallet.signMessage(message);

    try {
      // This would call an auth endpoint - for now, we'll simulate it
      // In a real implementation, this would exchange the signature for a JWT token
      this.token = `simulated-token-${signature.slice(0, 10)}`;
    } catch (error) {
      throw new Error(`Authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get approver status
   */
  getStatus(): { isRunning: boolean; agentId: string; walletAddress: string } {
    return {
      isRunning: this.isRunning,
      agentId: this.config.agentId,
      walletAddress: this.wallet.address,
    };
  }

  /**
   * Add validation rule
   * @param rule Validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validator.addRule(rule);
  }

  /**
   * Remove validation rule
   * @param name Rule name
   */
  removeValidationRule(name: string): void {
    this.validator.removeRule(name);
  }
}
