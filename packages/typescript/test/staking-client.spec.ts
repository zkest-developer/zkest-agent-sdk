/**
 * Staking Client Tests
 * @spec ADRL-0005
 */

import axios from 'axios';
import { StakingClient } from '../src/staking/staking-client';
import { SlashReason } from '../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StakingClient', () => {
  let client: StakingClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new StakingClient({ apiUrl: 'https://api.test.com' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStakeInfo', () => {
    it('should get stake info', async () => {
      const mockStake = {
        amount: '100000000000000000000',
        timestamp: new Date('2025-01-01'),
        locked: true,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockStake },
      });

      const result = await client.getStakeInfo('0x123');

      expect(result).toEqual(mockStake);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/staking/0x123');
    });
  });

  describe('getSlashHistory', () => {
    it('should get slash history', async () => {
      const mockSlashes = [
        {
          verifier: '0x123',
          amount: '20000000000000000000',
          reason: SlashReason.INACCURATE,
          timestamp: new Date('2025-01-15'),
          transactionHash: '0xabc',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockSlashes },
      });

      const result = await client.getSlashHistory('0x123');

      expect(result).toEqual(mockSlashes);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/staking/0x123/slashes');
    });
  });

  describe('getStakedVerifiers', () => {
    it('should get all staked verifiers', async () => {
      const mockVerifiers = [
        { address: '0x123', amount: '100' },
        { address: '0x456', amount: '200' },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockVerifiers },
      });

      const result = await client.getStakedVerifiers();

      expect(result).toEqual(mockVerifiers);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/staking/verifiers');
    });
  });

  describe('without blockchain', () => {
    it('should throw error when trying to stake without blockchain config', async () => {
      await expect(client.stake('100')).rejects.toThrow('Blockchain connection not configured');
    });

    it('should throw error when trying to request unstake without blockchain config', async () => {
      await expect(client.requestUnstake()).rejects.toThrow('Blockchain connection not configured');
    });

    it('should throw error when trying to unstake without blockchain config', async () => {
      await expect(client.unstake()).rejects.toThrow('Blockchain connection not configured');
    });
  });
});
