import axios from 'axios';
import { LedgerClient } from '../src/ledger';
import { LedgerDirection, LedgerReferenceType, LedgerStatus } from '../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LedgerClient', () => {
  let client: LedgerClient;
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
    client = new LedgerClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates ledger entry', async () => {
    const payload = {
      id: 'l1',
      referenceType: LedgerReferenceType.PAYMENT,
      referenceId: 'payment-1',
      tokenAddress: '0xabc',
      amount: '1.5',
      direction: LedgerDirection.CREDIT,
      status: LedgerStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAxiosInstance.post.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await client.createEntry({
      referenceType: LedgerReferenceType.PAYMENT,
      referenceId: 'payment-1',
      tokenAddress: '0xabc',
      amount: '1.5',
      direction: LedgerDirection.CREDIT,
    });

    expect(result).toEqual(payload);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/ledger/entries', {
      referenceType: LedgerReferenceType.PAYMENT,
      referenceId: 'payment-1',
      tokenAddress: '0xabc',
      amount: '1.5',
      direction: LedgerDirection.CREDIT,
    });
  });

  it('processes batch', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        success: true,
        data: { batchId: 'batch-1', processedCount: 12 },
      },
    });

    const result = await client.processBatch({ limit: 12 });
    expect(result).toEqual({ batchId: 'batch-1', processedCount: 12 });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/ledger/process-batch', { limit: 12 });
  });

  it('passes referenceId filter when listing entries', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: [], total: 0 },
    });

    await client.findEntries({
      referenceType: LedgerReferenceType.PAYMENT,
      referenceId: 'payment-1',
      status: LedgerStatus.PENDING,
      limit: 20,
      offset: 0,
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/ledger/entries', {
      params: {
        referenceType: LedgerReferenceType.PAYMENT,
        referenceId: 'payment-1',
        status: LedgerStatus.PENDING,
        limit: 20,
        offset: 0,
      },
    });
  });

  it('passes taskId/agentId/wallet filters when listing entries', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: [], total: 0 },
    });

    await client.findEntries({
      taskId: 'task-1',
      agentId: 'agent-1',
      wallet: '0xwallet',
      limit: 10,
      offset: 5,
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/ledger/entries', {
      params: {
        taskId: 'task-1',
        agentId: 'agent-1',
        wallet: '0xwallet',
        limit: 10,
        offset: 5,
      },
    });
  });
});
