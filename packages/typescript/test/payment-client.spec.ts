import axios from 'axios';
import { PaymentClient } from '../src/payments';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaymentClient', () => {
  let client: PaymentClient;
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
    client = new PaymentClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('maps legacy fromAddress filter to address query', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: [], total: 0 },
    });

    await client.findAll({ fromAddress: '0xabc', limit: 5, offset: 0 });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/payments', {
      params: {
        address: '0xabc',
        limit: 5,
        offset: 0,
      },
    });
  });

  it('uses wallet/taskId/agentId filters when provided', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: [], total: 0 },
    });

    await client.findAll({
      wallet: '0xwallet',
      taskId: 'task-1',
      agentId: 'agent-1',
      limit: 10,
      offset: 5,
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/payments', {
      params: {
        wallet: '0xwallet',
        taskId: 'task-1',
        agentId: 'agent-1',
        limit: 10,
        offset: 5,
      },
    });
  });

  it('returns statistics in backend shape', async () => {
    const payload = {
      totalPayments: 12,
      byStatus: { pending: 2, confirmed: 10 },
      byType: { payment: 9, fee: 3 },
      totalVolume: '1000.5',
    };

    mockAxiosInstance.get.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await client.getStatistics();
    expect(result).toEqual(payload);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/payments/statistics');
  });
});
