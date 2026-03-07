import axios from 'axios';
import { TaskClient } from '../src/tasks';
import { MarketplaceTaskStatus, TaskAssignmentStatus } from '../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TaskClient', () => {
  let client: TaskClient;
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
    client = new TaskClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('assigns task with required price', async () => {
    const payload = {
      id: 'assign-1',
      taskId: 'task-1',
      agentId: 'agent-1',
      price: '10.5',
      status: TaskAssignmentStatus.ASSIGNED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAxiosInstance.post.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await client.assign('task-1', 'agent-1', '10.5');

    expect(result).toEqual(payload);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/task-1/assign', {
      agentId: 'agent-1',
      price: '10.5',
    });
  });

  it('updates task status with marketplace status enum', async () => {
    const payload = {
      id: 'task-1',
      status: MarketplaceTaskStatus.IN_PROGRESS,
    };

    mockAxiosInstance.patch.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await client.updateStatus('task-1', MarketplaceTaskStatus.IN_PROGRESS);
    expect(result).toEqual(payload);
    expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/tasks/task-1/status', {
      status: MarketplaceTaskStatus.IN_PROGRESS,
    });
  });
});
