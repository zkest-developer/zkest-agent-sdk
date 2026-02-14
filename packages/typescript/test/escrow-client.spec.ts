/**
 * Escrow Client Tests
 * @spec ADRL-0003
 */

import axios from 'axios';
import { EscrowClient } from '../src/escrow/escrow-client';
import { EscrowStatus } from '../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EscrowClient', () => {
  let client: EscrowClient;
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
    client = new EscrowClient({ apiUrl: 'https://api.test.com' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEscrow', () => {
    it('should create escrow successfully', async () => {
      const mockEscrow = {
        id: '123',
        taskId: 'task-1',
        clientWallet: '0x123',
        agentWallet: '0x456',
        amount: '100',
        status: EscrowStatus.PENDING,
        deadline: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: mockEscrow },
      });

      const result = await client.createEscrow(
        {
          taskId: 'task-1',
          agentWallet: '0x456',
          amount: '100',
          deadline: new Date(),
        },
        'test-token'
      );

      expect(result).toEqual(mockEscrow);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/escrows',
        expect.any(Object),
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });
  });

  describe('getEscrows', () => {
    it('should get escrows with filters', async () => {
      const mockEscrows = [
        { id: '1', status: EscrowStatus.ACTIVE },
        { id: '2', status: EscrowStatus.PENDING },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true, data: mockEscrows },
      });

      const result = await client.getEscrows({ status: EscrowStatus.ACTIVE });

      expect(result).toEqual(mockEscrows);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/escrows', {
        params: { status: EscrowStatus.ACTIVE },
      });
    });
  });

  describe('confirmCompletion', () => {
    it('should confirm completion', async () => {
      const mockEscrow = {
        id: '123',
        status: EscrowStatus.COMPLETED,
        agentConfirmed: true,
      };

      mockAxiosInstance.patch.mockResolvedValue({
        data: { success: true, data: mockEscrow },
      });

      const result = await client.confirmCompletion(
        '123',
        { resultUrl: 'https://example.com/result' },
        'test-token'
      );

      expect(result).toEqual(mockEscrow);
    });
  });

  describe('raiseDispute', () => {
    it('should raise dispute', async () => {
      const mockDispute = {
        id: 'dispute-1',
        escrowId: '123',
        reason: 'Incomplete work',
        status: 'open',
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: mockDispute },
      });

      const result = await client.raiseDispute(
        '123',
        { reason: 'Incomplete work' },
        'test-token'
      );

      expect(result).toEqual(mockDispute);
    });
  });
});
