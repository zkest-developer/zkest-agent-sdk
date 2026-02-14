/**
 * Verification Client Tests
 * @spec ADRL-0004
 */

import axios from 'axios';
import { VerificationClient } from '../src/verification/verification-client';
import { VerificationStatus, Tier } from '../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VerificationClient', () => {
  let client: VerificationClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create mock axios instance
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
    client = new VerificationClient({ apiUrl: 'https://api.test.com' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitVerification', () => {
    it('should submit verification successfully', async () => {
      const mockVerification = {
        id: '123',
        agentId: 'agent-1',
        skill: 'typescript',
        evidenceUrl: 'https://example.com/evidence',
        status: VerificationStatus.PENDING,
        submittedAt: new Date(),
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: mockVerification },
      });

      const result = await client.submitVerification(
        {
          agentId: 'agent-1',
          skill: 'typescript',
          evidenceUrl: 'https://example.com/evidence',
        },
        'test-token'
      );

      expect(result).toEqual(mockVerification);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/verifications',
        expect.any(Object),
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });

    it('should handle submission errors', async () => {
      const mockError = new Error('Network error') as any;
      mockError.response = { status: 409, data: { message: 'Already exists' } };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        client.submitVerification(
          {
            agentId: 'agent-1',
            skill: 'typescript',
            evidenceUrl: 'https://example.com/evidence',
          },
          'test-token'
        )
      ).rejects.toMatchObject({
        success: false,
      });
    });
  });

  describe('getPendingVerifications', () => {
    it('should get pending verifications', async () => {
      const mockVerifications = [
        { id: '1', skill: 'typescript', status: VerificationStatus.PENDING },
        { id: '2', skill: 'python', status: VerificationStatus.PENDING },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockVerifications },
      });

      const result = await client.getPendingVerifications();

      expect(result).toEqual(mockVerifications);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/verifications/pending');
    });
  });

  describe('getAgentMetrics', () => {
    it('should get agent metrics', async () => {
      const mockMetrics = {
        agentId: 'agent-1',
        tier: Tier.BASIC,
        completedTasks: 5,
        reputationScore: 85,
        verifiedSkills: ['typescript'],
        averageRating: 4.5,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await client.getAgentMetrics('agent-1');

      expect(result).toEqual(mockMetrics);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/verifications/agents/agent-1/metrics'
      );
    });
  });

  describe('updateReputation', () => {
    it('should update agent reputation', async () => {
      const mockMetrics = {
        agentId: 'agent-1',
        tier: Tier.BASIC,
        reputationScore: 90,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await client.updateReputation(
        'agent-1',
        { rating: 5, onTime: true, disputed: false },
        'test-token'
      );

      expect(result).toEqual(mockMetrics);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/verifications/agents/agent-1/reputation',
        { rating: 5, onTime: true, disputed: false },
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });
  });

  describe('setTier', () => {
    it('should set agent tier', async () => {
      const mockMetrics = {
        agentId: 'agent-1',
        tier: Tier.ADVANCED,
        reputationScore: 95,
      };

      mockAxiosInstance.patch.mockResolvedValue({
        data: { success: true, data: mockMetrics },
      });

      const result = await client.setTier(
        'agent-1',
        Tier.ADVANCED,
        'Performance improved',
        'test-token'
      );

      expect(result).toEqual(mockMetrics);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/verifications/agents/agent-1/tier',
        { tier: Tier.ADVANCED, reason: 'Performance improved' },
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });
  });
});
