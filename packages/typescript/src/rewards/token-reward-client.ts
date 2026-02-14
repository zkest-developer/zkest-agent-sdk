/**
 * Token Reward Client
 * @spec ADRL-0005
 *
 * Client for token reward calculations and distributions
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ethers } from 'ethers';
import {
  TokenRewardCalculation,
  RewardDistribution,
  ApiResponse,
  ApiError,
  RetryableAxiosRequestConfig,
} from '../types';

/**
 * Token Reward Client Configuration
 */
export interface TokenRewardClientConfig {
  apiUrl: string;
  contractAddress?: string;
  rpcUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Reward Constants
 */
export const REWARD_CONSTANTS = {
  INITIAL_REWARD: '100000000000000000000', // 100 tokens in wei
  HALVING_PERIOD: 210000,
  MIN_REWARD: '1000000000000000000', // 1 token in wei
  SUPPLY_THRESHOLDS: {
    TIER_1: '1000000000000000000000000', // 1M tokens
    TIER_2: '10000000000000000000000000', // 10M tokens
    TIER_3: '100000000000000000000000000', // 100M tokens
  },
  SUPPLY_FACTORS: {
    DEFAULT: 100,
    TIER_1: 90,
    TIER_2: 50,
    TIER_3: 10,
  },
};

/**
 * Token Reward Client
 *
 * Provides methods for token reward calculations
 */
export class TokenRewardClient {
  private client: AxiosInstance;
  private contract?: ethers.Contract;
  private maxRetries: number;

  constructor(config: TokenRewardClientConfig) {
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
    if (config.contractAddress && config.rpcUrl) {
      this.setupBlockchain(config.contractAddress, config.rpcUrl);
    }
  }

  /**
   * Setup blockchain connection
   * @param contractAddress Contract address
   * @param rpcUrl RPC URL
   */
  private setupBlockchain(contractAddress: string, rpcUrl: string): void {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Minimal ABI for token contract
    const abi = [
      'function calculateVerificationReward() view returns (uint256)',
      'function verificationCount() view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
    ];

    this.contract = new ethers.Contract(contractAddress, abi, provider);
  }

  /**
   * Calculate minting reward (on-chain or local)
   * @param verificationCount Current verification count
   * @param totalSupply Current total supply
   * @returns Calculated minting reward
   */
  async calculateMintingReward(
    verificationCount?: number,
    totalSupply?: string
  ): Promise<string> {
    // Try to get from contract first
    if (this.contract) {
      try {
        const reward = await this.contract.calculateVerificationReward();
        return reward.toString();
      } catch (error) {
        console.warn('Failed to get reward from contract, using local calculation');
      }
    }

    // Local calculation
    const count = verificationCount ?? 0;
    const supply = totalSupply ?? '0';

    return this.calculateRewardLocally(count, supply);
  }

  /**
   * Calculate reward locally
   * @param verificationCount Verification count
   * @param totalSupply Total supply
   * @returns Calculated reward
   */
  private calculateRewardLocally(verificationCount: number, totalSupply: string): string {
    // Calculate halvings
    const halvings = Math.floor(verificationCount / REWARD_CONSTANTS.HALVING_PERIOD);

    // Calculate base reward with halving
    const initialReward = BigInt(REWARD_CONSTANTS.INITIAL_REWARD);
    const baseReward = initialReward / BigInt(2 ** halvings);

    // Calculate supply adjustment
    const supply = BigInt(totalSupply);
    const tier1 = BigInt(REWARD_CONSTANTS.SUPPLY_THRESHOLDS.TIER_1);
    const tier2 = BigInt(REWARD_CONSTANTS.SUPPLY_THRESHOLDS.TIER_2);
    const tier3 = BigInt(REWARD_CONSTANTS.SUPPLY_THRESHOLDS.TIER_3);

    let supplyFactor = BigInt(REWARD_CONSTANTS.SUPPLY_FACTORS.DEFAULT);

    if (supply >= tier1 && supply < tier2) {
      supplyFactor = BigInt(REWARD_CONSTANTS.SUPPLY_FACTORS.TIER_1);
    } else if (supply >= tier2 && supply < tier3) {
      supplyFactor = BigInt(REWARD_CONSTANTS.SUPPLY_FACTORS.TIER_2);
    } else if (supply >= tier3) {
      supplyFactor = BigInt(REWARD_CONSTANTS.SUPPLY_FACTORS.TIER_3);
    }

    // Apply supply adjustment
    const adjustedReward = (baseReward * supplyFactor) / BigInt(100);

    // Ensure minimum reward
    const minReward = BigInt(REWARD_CONSTANTS.MIN_REWARD);
    return adjustedReward > minReward ? adjustedReward.toString() : minReward.toString();
  }

  /**
   * Calculate fee reward
   * @param taskRewardAmount Task reward amount
   * @param verificationFeeRate Verification fee rate (1-50%)
   * @param verifierFeeRatio Verifier fee ratio (0-100%)
   * @param totalVerifiers Total number of verifiers
   * @returns Fee reward per verifier
   */
  calculateFeeReward(
    taskRewardAmount: string,
    verificationFeeRate: number,
    verifierFeeRatio: number,
    totalVerifiers: number
  ): string {
    if (totalVerifiers === 0) {
      return '0';
    }

    const reward = BigInt(taskRewardAmount);

    // Calculate total fee pool
    const feePool = (reward * BigInt(verificationFeeRate)) / BigInt(100);

    // Calculate verifier pool
    const verifierPool = (feePool * BigInt(verifierFeeRatio)) / BigInt(100);

    // Divide by verifiers
    const feePerVerifier = verifierPool / BigInt(totalVerifiers);

    return feePerVerifier.toString();
  }

  /**
   * Calculate total reward with bonuses
   * @param taskId Task ID
   * @param verifierAddress Verifier address
   * @returns Total reward calculation
   */
  async calculateTotalReward(taskId: string, verifierAddress: string): Promise<TokenRewardCalculation> {
    try {
      const response = await this.client.get<ApiResponse<TokenRewardCalculation>>(
        `/api/v1/rewards/${taskId}/${verifierAddress}/calculation`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get reward distribution for a task
   * @param taskId Task ID
   * @returns Reward distribution details
   */
  async getRewardDistribution(taskId: string): Promise<RewardDistribution> {
    try {
      const response = await this.client.get<ApiResponse<RewardDistribution>>(
        `/api/v1/rewards/${taskId}/distribution`
      );

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get verification count
   * @returns Current verification count
   */
  async getVerificationCount(): Promise<number> {
    if (this.contract) {
      try {
        const count = await this.contract.verificationCount();
        return Number(count);
      } catch (error) {
        console.warn('Failed to get count from contract');
      }
    }

    // Fallback to API
    try {
      const response = await this.client.get<ApiResponse<{ count: number }>>('/api/v1/rewards/count');
      return response.data.data.count;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get total token supply
   * @returns Total supply
   */
  async getTotalSupply(): Promise<string> {
    if (this.contract) {
      try {
        const supply = await this.contract.totalSupply();
        return supply.toString();
      } catch (error) {
        console.warn('Failed to get supply from contract');
      }
    }

    // Fallback to API
    try {
      const response = await this.client.get<ApiResponse<{ supply: string }>>('/api/v1/rewards/supply');
      return response.data.data.supply;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get token balance
   * @param address Wallet address
   * @returns Token balance
   */
  async getBalance(address: string): Promise<string> {
    if (this.contract) {
      try {
        const balance = await this.contract.balanceOf(address);
        return balance.toString();
      } catch (error) {
        console.warn('Failed to get balance from contract');
      }
    }

    // Fallback to API
    try {
      const response = await this.client.get<ApiResponse<{ balance: string }>>(
        `/api/v1/rewards/balance/${address}`
      );
      return response.data.data.balance;
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
}
