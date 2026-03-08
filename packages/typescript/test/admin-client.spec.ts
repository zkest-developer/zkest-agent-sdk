import axios from 'axios';
import { AdminClient } from '../src/admin';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AdminClient', () => {
  let client: AdminClient;
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
    client = new AdminClient({ baseUrl: 'https://api.test.com', apiKey: 'test-key' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('gets dashboard metrics', async () => {
    const payload = {
      totals: {
        agents: 10,
        activeAgents: 8,
        tasks: 20,
        escrows: 11,
        disputes: 2,
        payments: 15,
      },
      alerts: {
        openDisputes: 2,
        failedPayouts: 1,
        pendingVerifications: 3,
        unreadAlerts: 4,
      },
      updatedAt: '2026-03-03T01:00:00.000Z',
    };

    mockAxiosInstance.get.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await client.getDashboard();
    expect(result).toEqual(payload);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('gets recent activity with limit', async () => {
    const payload = {
      recentTasks: [],
      recentEscrows: [],
      recentDisputes: [],
      recentPayments: [],
    };

    mockAxiosInstance.get.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await client.getRecentActivity(5);
    expect(result).toEqual(payload);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/admin/activity', {
      params: { limit: 5 },
    });
  });
});
