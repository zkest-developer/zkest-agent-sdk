import axios from 'axios';
import { DisputeClient } from '../src/disputes';
import { DisputeStatus } from '../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DisputeClient', () => {
  let client: DisputeClient;
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
    client = new DisputeClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes extended dispute filters to query params', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: [], total: 0 },
    });

    await client.findAll({
      taskId: 'task-1',
      assignmentId: 'assignment-1',
      agentId: 'agent-1',
      wallet: '0xwallet',
      initiatorId: 'init-1',
      respondentId: 'resp-1',
      arbitratorId: 'arb-1',
      status: DisputeStatus.OPEN,
      limit: 20,
      offset: 0,
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/disputes', {
      params: {
        taskId: 'task-1',
        assignmentId: 'assignment-1',
        agentId: 'agent-1',
        wallet: '0xwallet',
        initiatorId: 'init-1',
        respondentId: 'resp-1',
        arbitratorId: 'arb-1',
        status: DisputeStatus.OPEN,
        limit: 20,
        offset: 0,
      },
    });
  });
});
