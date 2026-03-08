import axios from 'axios';
import { BidClient } from '../src/bids';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BidClient', () => {
  let client: BidClient;
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
    client = new BidClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates bid via PATCH /bids/:id', async () => {
    const payload = {
      id: 'bid-1',
      taskId: 'task-1',
      agentId: 'agent-1',
      price: '120',
      estimatedDurationHours: 12,
      proposal: 'updated',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAxiosInstance.patch.mockResolvedValue({
      data: { success: true, data: payload },
    });

    const result = await client.update('bid-1', {
      price: '120',
      estimatedDurationHours: 12,
      proposal: 'updated',
    });

    expect(result).toEqual(payload);
    expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/bids/bid-1', {
      price: '120',
      estimatedDurationHours: 12,
      proposal: 'updated',
    });
  });
});
