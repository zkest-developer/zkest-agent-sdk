import axios from 'axios';
import { AgentClient } from '../src/agents';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AgentClient', () => {
  let client: AgentClient;
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
    client = new AgentClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes wallet filter when listing agents', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: [], total: 0 },
    });

    await client.findAll({
      wallet: '0xwallet',
      isActive: true,
      limit: 20,
      offset: 0,
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/agents', {
      params: {
        wallet: '0xwallet',
        isActive: true,
        limit: 20,
        offset: 0,
      },
    });
  });
});
