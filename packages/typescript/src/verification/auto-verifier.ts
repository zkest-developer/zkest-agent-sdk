/**
 * Auto Verifier
 * @spec ADRL-0004
 *
 * Automatically receives verification requests and submits verification results
 */

import { ethers } from 'ethers';
import { VerificationClient } from './verification-client';
import { TestRunner, TestConfig } from './test-runner';
import { VerificationStream } from '../websocket/verification-stream';
import {
  VerificationRequest,
  VerificationResult,
  SDKConfig,
  UpdateVerificationDto,
  VerificationStatus,
} from '../types';

/**
 * Auto Verifier Configuration
 */
export interface AutoVerifierConfig extends SDKConfig {
  stakeAmount?: number;
  maxConcurrentVerifications?: number;
  autoAccept?: boolean;
}

/**
 * Verification callback
 */
export type VerificationCallback = (task: VerificationRequest) => Promise<VerificationResult>;

/**
 * Auto Verifier
 *
 * Automatically listens for verification requests and processes them
 */
export class AutoVerifier {
  private client: VerificationClient;
  private testRunner: TestRunner;
  private stream?: VerificationStream;
  private wallet: ethers.Wallet;
  private config: AutoVerifierConfig;
  private callbacks: Map<string, VerificationCallback> = new Map();
  private isRunning: boolean = false;
  private token?: string;

  constructor(config: AutoVerifierConfig) {
    this.config = config;
    this.wallet = new ethers.Wallet(config.privateKey);
    this.client = new VerificationClient({ apiUrl: config.apiUrl });
    this.testRunner = new TestRunner();

    if (config.wsUrl) {
      this.stream = new VerificationStream({
        wsUrl: config.wsUrl,
        agentId: config.agentId,
      });

      this.stream.on('verification_submitted', (data) => {
        this.handleVerificationRequest(data);
      });
    }
  }

  /**
   * Start the auto verifier
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Auto verifier is already running');
    }

    this.isRunning = true;

    // Authenticate and get token
    await this.authenticate();

    // Connect to WebSocket
    if (this.stream) {
      await this.stream.connect();
    }

    // Poll for pending verifications
    if (!this.stream) {
      this.pollPendingVerifications();
    }
  }

  /**
   * Stop the auto verifier
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.stream) {
      await this.stream.disconnect();
    }

    this.testRunner.stopAllTests();
  }

  /**
   * Register a callback for a specific skill
   * @param skill Skill name
   * @param callback Verification callback
   */
  registerCallback(skill: string, callback: VerificationCallback): void {
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
   * Verify a task
   * @param task Verification request
   * @returns Verification result
   */
  async verifyTask(task: VerificationRequest): Promise<VerificationResult> {
    const callback = this.callbacks.get(task.skill.toLowerCase());

    if (callback) {
      return await callback(task);
    }

    // Default verification: run tests
    return await this.runDefaultVerification(task);
  }

  /**
   * Submit verification result
   * @param taskId Task ID
   * @param result Verification result
   */
  async submitVerification(taskId: string, result: VerificationResult): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const data: UpdateVerificationDto = {
      status: result.valid ? VerificationStatus.APPROVED : VerificationStatus.REJECTED,
      rejectionReason: result.feedback,
    };

    await this.client.updateVerification(taskId, data, this.token);
  }

  /**
   * Handle verification request
   * @param task Verification request
   */
  private async handleVerificationRequest(task: VerificationRequest): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Check if auto-accept is enabled
      if (!this.config.autoAccept) {
        return;
      }

      // Verify the task
      const result = await this.verifyTask(task);

      // Submit the result
      await this.submitVerification(task.id, result);
    } catch (error) {
      console.error('Error handling verification request:', error);
    }
  }

  /**
   * Run default verification
   * @param task Verification request
   * @returns Verification result
   */
  private async runDefaultVerification(task: VerificationRequest): Promise<VerificationResult> {
    // Try to run tests from evidence URL
    try {
      const testConfig: TestConfig = {
        command: 'npm',
        args: ['test'],
        timeout: 30000,
      };

      const result = await this.testRunner.runTest(task.id, testConfig);
      return {
        valid: result.valid,
        score: result.score,
        feedback: result.feedback,
        evidence: result.stdout,
      };
    } catch (error) {
      return {
        valid: false,
        feedback: `Verification failed: ${(error as Error).message}`,
      };
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
   * Poll for pending verifications
   */
  private async pollPendingVerifications(): Promise<void> {
    while (this.isRunning) {
      try {
        const verifications = await this.client.getPendingVerifications();

        for (const verification of verifications) {
          await this.handleVerificationRequest(verification);
        }
      } catch (error) {
        console.error('Error polling verifications:', error);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  /**
   * Get verifier status
   */
  getStatus(): { isRunning: boolean; agentId: string; walletAddress: string } {
    return {
      isRunning: this.isRunning,
      agentId: this.config.agentId,
      walletAddress: this.wallet.address,
    };
  }
}
