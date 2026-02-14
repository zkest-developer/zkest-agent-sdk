/**
 * Consensus Verifier
 * @spec ADRL-0005
 *
 * Automated verifier for multi-verifier consensus-based task verification
 */

import { ethers } from 'ethers';
import { MultiVerifierClient } from './multi-verifier-client';
import { TestRunner } from './test-runner';
import { VerificationStream } from '../websocket/verification-stream';
import {
  TaskVerification,
  TaskType,
  SubmitTaskVerificationDto,
  VerifierMetrics,
  VerificationRequest,
  ConsensusResult,
  SDKConfig,
} from '../types';

/**
 * Consensus Verifier Configuration
 */
export interface ConsensusVerifierConfig extends SDKConfig {
  stakeAmount?: number;
  autoAccept?: boolean;
  testTimeout?: number;
  maxConcurrentVerifications?: number;
}

/**
 * Verification callback
 */
export type ConsensusVerificationCallback = (task: TaskVerification) => Promise<{
  approved: boolean;
  reasoning: string;
  confidenceScore: number;
  evidenceIpfsHash?: string;
  testResults?: object;
}>;

/**
 * Consensus Verifier
 *
 * Automatically participates in multi-verifier consensus for task verification
 */
export class ConsensusVerifier {
  private client: MultiVerifierClient;
  private testRunner: TestRunner;
  private stream?: VerificationStream;
  private wallet: ethers.Wallet;
  private config: ConsensusVerifierConfig;
  private callbacks: Map<TaskType, ConsensusVerificationCallback> = new Map();
  private isRunning: boolean = false;
  private token?: string;
  private pendingVerifications: Set<string> = new Set();

  constructor(config: ConsensusVerifierConfig) {
    this.config = config;
    this.wallet = new ethers.Wallet(config.privateKey);
    this.client = new MultiVerifierClient({ apiUrl: config.apiUrl });
    this.testRunner = new TestRunner(config.testTimeout ?? 30000);

    if (config.wsUrl) {
      this.stream = new VerificationStream({
        wsUrl: config.wsUrl,
        agentId: config.agentId,
      });

      this.stream.on('verification_requested', (data) => {
        this.handleVerificationRequested(data);
      });

      this.stream.on('consensus_reached', (data) => {
        this.handleConsensusReached(data);
      });
    }
  }

  /**
   * Start the consensus verifier
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Consensus verifier is already running');
    }

    this.isRunning = true;

    // Authenticate and get token
    await this.authenticate();

    // Connect to WebSocket
    if (this.stream) {
      await this.stream.connect();
    }

    // Poll for verification opportunities if no WebSocket
    if (!this.stream) {
      this.pollVerificationOpportunities();
    }
  }

  /**
   * Stop the consensus verifier
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.stream) {
      await this.stream.disconnect();
    }

    this.testRunner.stopAllTests();
    this.pendingVerifications.clear();
  }

  /**
   * Register a callback for a specific task type
   * @param taskType Task type
   * @param callback Verification callback
   */
  registerCallback(taskType: TaskType, callback: ConsensusVerificationCallback): void {
    this.callbacks.set(taskType, callback);
  }

  /**
   * Unregister a callback
   * @param taskType Task type
   */
  unregisterCallback(taskType: TaskType): void {
    this.callbacks.delete(taskType);
  }

  /**
   * Verify a task
   * @param task Task verification
   * @returns Verification result
   */
  async verifyTask(task: TaskVerification): Promise<{
    approved: boolean;
    reasoning: string;
    confidenceScore: number;
    evidenceIpfsHash?: string;
    testResults?: object;
  }> {
    const callback = this.callbacks.get(task.taskType);

    if (callback) {
      return await callback(task);
    }

    // Default verification: run tests if available
    return await this.runDefaultVerification(task);
  }

  /**
   * Submit verification for a task
   * @param taskId Task ID
   * @param result Verification result
   */
  async submitVerification(
    taskId: string,
    result: {
      approved: boolean;
      reasoning: string;
      confidenceScore: number;
      evidenceIpfsHash?: string;
      testResults?: object;
    }
  ): Promise<{ consensusReached: boolean; approvalRatio: number }> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const data: SubmitTaskVerificationDto = {
      verifierAddress: this.wallet.address,
      approved: result.approved,
      reasoning: result.reasoning,
      confidenceScore: result.confidenceScore,
      evidenceIpfsHash: result.evidenceIpfsHash,
      testResults: result.testResults,
    };

    const submissionResult = await this.client.submitVerification(taskId, data, this.token);

    // Remove from pending if consensus reached
    if (submissionResult.consensusReached) {
      this.pendingVerifications.delete(taskId);
    }

    return submissionResult;
  }

  /**
   * Get own verifier metrics
   */
  async getMetrics(): Promise<VerifierMetrics> {
    return await this.client.getVerifierMetrics(this.wallet.address);
  }

  /**
   * Handle verification requested event
   * @param data Task data
   */
  private async handleVerificationRequested(data: VerificationRequest): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const taskId = data.id;

    // Check if already verified this task
    if (this.pendingVerifications.has(taskId)) {
      return;
    }

    // Check if auto-accept is enabled
    if (!this.config.autoAccept) {
      return;
    }

    try {
      // Get task details
      const task = await this.client.getVerificationStatus(taskId);

      // Verify the task
      const result = await this.verifyTask(task);

      // Submit verification
      await this.submitVerification(taskId, result);

      // Add to pending
      this.pendingVerifications.add(taskId);
    } catch (error) {
      console.error('Error handling verification request:', error);
    }
  }

  /**
   * Handle consensus reached event
   * @param data Consensus data
   */
  private async handleConsensusReached(data: ConsensusResult & { taskId: string }): Promise<void> {
    console.log(`Consensus reached for task ${data.taskId}: ${data.approved ? 'Approved' : 'Rejected'}`);
    console.log(`Approval ratio: ${data.approvalRatio}%`);

    // Remove from pending
    this.pendingVerifications.delete(data.taskId);
  }

  /**
   * Run default verification
   * @param task Task verification
   * @returns Verification result
   */
  private async runDefaultVerification(
    task: TaskVerification
  ): Promise<{
    approved: boolean;
    reasoning: string;
    confidenceScore: number;
    testResults?: object;
  }> {
    try {
      // If test script is available, run it
      if (task.testScriptIpfsHash) {
        const testResult = await this.testRunner.runTest(task.id, {
          command: 'npm',
          args: ['test'],
          timeout: 30000,
        });

        return {
          approved: testResult.valid,
          reasoning: testResult.feedback ?? 'Automated test completed',
          confidenceScore: testResult.score ?? 50,
          testResults: {
            valid: testResult.valid,
            score: testResult.score,
            feedback: testResult.feedback,
            stdout: testResult.stdout,
            stderr: testResult.stderr,
          },
        };
      }

      // No test script, approve with low confidence
      return {
        approved: true,
        reasoning: 'No automated test available, manual review recommended',
        confidenceScore: 50,
      };
    } catch (error) {
      return {
        approved: false,
        reasoning: `Verification failed: ${(error as Error).message}`,
        confidenceScore: 0,
      };
    }
  }

  /**
   * Authenticate with the API
   */
  private async authenticate(): Promise<void> {
    // Sign a message to prove identity
    const message = `Authenticate as verifier ${this.config.agentId} at ${Date.now()}`;
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
   * Poll for verification opportunities
   */
  private async pollVerificationOpportunities(): Promise<void> {
    while (this.isRunning) {
      try {
        // In a real implementation, this would query for available verification opportunities
        // For now, we'll just wait
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('Error polling verification opportunities:', error);
      }
    }
  }

  /**
   * Get verifier status
   */
  getStatus(): {
    isRunning: boolean;
    agentId: string;
    walletAddress: string;
    pendingVerifications: number;
  } {
    return {
      isRunning: this.isRunning,
      agentId: this.config.agentId,
      walletAddress: this.wallet.address,
      pendingVerifications: this.pendingVerifications.size,
    };
  }
}
