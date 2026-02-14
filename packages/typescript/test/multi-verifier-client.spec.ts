/**
 * Multi-Verifier Client Tests
 * @spec ADRL-0005
 */

import axios from 'axios';
import { MultiVerifierClient } from '../src/verification/multi-verifier-client';
import { TaskType, TaskStatus } from '../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MultiVerifierClient', () => {
  let client: MultiVerifierClient;
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
    client = new MultiVerifierClient({ apiUrl: 'https://api.test.com' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestVerification', () => {
    it('should request verification successfully', async () => {
      const mockTask = {
        id: 'task-1',
        taskType: TaskType.CODE,
        status: TaskStatus.UNDER_VERIFICATION,
        minVerifiers: 3,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: mockTask },
      });

      const result = await client.requestVerification('task-1', 'test-token');

      expect(result).toEqual(mockTask);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/tasks/task-1/verification-request',
        {},
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });
  });

  describe('submitVerification', () => {
    it('should submit verification successfully', async () => {
      const mockResult = {
        consensusReached: true,
        approvalRatio: 100,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: mockResult },
      });

      const result = await client.submitVerification(
        'task-1',
        {
          verifierAddress: '0x123',
          approved: true,
          reasoning: 'Test passed',
          confidenceScore: 95,
        },
        'test-token'
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('getConsensus', () => {
    it('should get consensus result', async () => {
      const mockConsensus = {
        approved: true,
        approvalRatio: 100,
        totalVerifications: 3,
        approvalCount: 3,
        quorumRatio: 66,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockConsensus },
      });

      const result = await client.getConsensus('task-1');

      expect(result).toEqual(mockConsensus);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/tasks/task-1/consensus');
    });
  });

  describe('autoApproveOrReject', () => {
    it('should auto-approve task', async () => {
      const mockResult = {
        success: true,
        taskId: 'task-1',
        rewardsDistributed: true,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: mockResult },
      });

      const result = await client.autoApproveOrReject(
        'task-1',
        true,
        'Tests passed',
        { passed: true }
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('getVerifierMetrics', () => {
    it('should get verifier metrics', async () => {
      const mockMetrics = {
        verifierId: 'verifier-1',
        totalVerifications: 10,
        correctVerifications: 9,
        accuracy: 90,
        totalEarned: '500',
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await client.getVerifierMetrics('verifier-1');

      expect(result).toEqual(mockMetrics);
    });
  });

  describe('checkQuorum', () => {
    it('should check quorum status', async () => {
      const mockQuorum = {
        reached: true,
        currentVerifications: 3,
        minVerifiers: 3,
        quorumRatio: 66,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockQuorum },
      });

      const result = await client.checkQuorum('task-1');

      expect(result).toEqual(mockQuorum);
    });
  });
});
