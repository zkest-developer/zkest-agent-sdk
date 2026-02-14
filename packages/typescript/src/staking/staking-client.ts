/**
 * Staking Client
 * @spec ADRL-0005
 *
 * HTTP and blockchain client for verifier staking operations
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ethers } from 'ethers';
import { StakeInfo, SlashReason, ApiResponse, ApiError, RetryableAxiosRequestConfig } from '../types';

/**
 * Staking Client Configuration
 */
export interface StakingClientConfig {
  apiUrl: string;
  contractAddress?: string;
  rpcUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Stake Transaction
 */
export interface StakeTransaction {
  hash: string;
  from: string;
  amount: string;
  timestamp: Date;
}

/**
 * Slash Event
 */
export interface SlashEvent {
  verifier: string;
  amount: string;
  reason: SlashReason;
  timestamp: Date;
  transactionHash: string;
}

/**
 * Staking Client
 *
 * Provides methods for staking operations
 */
export class StakingClient {
  private client: AxiosInstance;
  private contract?: ethers.Contract;
  private wallet?: ethers.Wallet;
  private maxRetries: number;

  constructor(config: StakingClientConfig, privateKey?: string) {
    this.maxRetries = config.maxRetries ?? 3;

    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for retries
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RetryableAxiosRequestConfig | undefined;

        if (!config || config.__retryCount >= this.maxRetries) {
          throw this.handleError(error);
        }

        config.__retryCount = config.__retryCount ?? 0;
        config.__retryCount += 1;

        // Exponential backoff
        const delay = Math.pow(2, config.__retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.client(config);
      }
    );

    // Setup blockchain connection if provided
    if (config.contractAddress && config.rpcUrl && privateKey) {
      this.setupBlockchain(config.contractAddress, config.rpcUrl, privateKey);
    }
  }

  /**
   * Setup blockchain connection
   * @param contractAddress Contract address
   * @param rpcUrl RPC URL
   * @param privateKey Private key
   */
  private setupBlockchain(
    contractAddress: string,
    rpcUrl: string,
    privateKey: string
  ): void {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, provider);

    // Minimal ABI for staking contract
    const abi = [
      'function stake(uint256 amount) external',
      'function requestUnstake() external',
      'function unstake() external',
      'function totalStaked(address) view returns (uint256)',
      'function stakes(address) view returns (uint256 amount, uint256 timestamp, uint256 unlockTime)',
    ];

    this.contract = new ethers.Contract(contractAddress, abi, this.wallet);
  }

  /**
   * Stake tokens (on-chain)
   * @param amount Amount to stake (in wei)
   * @returns Transaction hash
   */
  async stake(amount: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Blockchain connection not configured');
    }

    try {
      const tx = await this.contract.stake(amount);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      throw this.handleBlockchainError(error);
    }
  }

  /**
   * Request unstake (on-chain)
   * @returns Transaction hash and unlock time
   */
  async requestUnstake(): Promise<{ hash: string; unlockTime: Date }> {
    if (!this.contract) {
      throw new Error('Blockchain connection not configured');
    }

    try {
      const tx = await this.contract.requestUnstake();
      const receipt = await tx.wait();

      // Get unlock time from contract
      const stake = await this.contract.stakes(this.wallet!.address);
      const unlockTime = new Date(Number(stake.unlockTime) * 1000);

      return {
        hash: receipt.hash,
        unlockTime,
      };
    } catch (error) {
      throw this.handleBlockchainError(error);
    }
  }

  /**
   * Unstake tokens (on-chain)
   * @returns Transaction hash
   */
  async unstake(): Promise<string> {
    if (!this.contract) {
      throw new Error('Blockchain connection not configured');
    }

    try {
      const tx = await this.contract.unstake();
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      throw this.handleBlockchainError(error);
    }
  }

  /**
   * Get stake info (from API)
   * @param verifierAddress Verifier address
   * @returns Stake information
   */
  async getStakeInfo(verifierAddress: string): Promise<StakeInfo> {
    try {
      const response = await this.client.get<ApiResponse<StakeInfo>>(
        `/api/v1/staking/${verifierAddress}`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get total staked amount (on-chain)
   * @param verifierAddress Verifier address
   * @returns Total staked amount
   */
  async getTotalStaked(verifierAddress: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Blockchain connection not configured');
    }

    try {
      const total = await this.contract.totalStaked(verifierAddress);
      return total.toString();
    } catch (error) {
      throw this.handleBlockchainError(error);
    }
  }

  /**
   * Get stake info from contract (on-chain)
   * @param verifierAddress Verifier address
   * @returns Stake information
   */
  async getStakeFromContract(verifierAddress: string): Promise<StakeInfo> {
    if (!this.contract) {
      throw new Error('Blockchain connection not configured');
    }

    try {
      const stake = await this.contract.stakes(verifierAddress);

      return {
        amount: stake.amount.toString(),
        timestamp: new Date(Number(stake.timestamp) * 1000),
        unlockTime:
          Number(stake.unlockTime) > 0
            ? new Date(Number(stake.unlockTime) * 1000)
            : undefined,
        locked: Number(stake.unlockTime) === 0 || Number(stake.unlockTime) > Date.now() / 1000,
      };
    } catch (error) {
      throw this.handleBlockchainError(error);
    }
  }

  /**
   * Get slash history
   * @param verifierAddress Verifier address
   * @returns Array of slash events
   */
  async getSlashHistory(verifierAddress: string): Promise<SlashEvent[]> {
    try {
      const response = await this.client.get<ApiResponse<SlashEvent[]>>(
        `/api/v1/staking/${verifierAddress}/slashes`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all staked verifiers
   * @returns Array of staked verifier addresses
   */
  async getStakedVerifiers(): Promise<Array<{ address: string; amount: string }>> {
    try {
      const response = await this.client.get<
        ApiResponse<Array<{ address: string; amount: string }>>
      >('/api/v1/staking/verifiers');

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param error Axios error
   * @returns Formatted API error
   */
  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message ?? error.message,
        statusCode: error.response?.status ?? 500,
        details: error.response?.data,
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      statusCode: 500,
    };
  }

  /**
   * Handle blockchain errors
   * @param error Blockchain error
   * @returns Formatted API error
   */
  private handleBlockchainError(error: unknown): ApiError {
    const ethersError = error as { reason?: string; message?: string };
    const message = ethersError.reason ?? ethersError.message ?? 'Blockchain transaction failed';

    return {
      success: false,
      message,
      statusCode: 500,
      details: error,
    };
  }
}
