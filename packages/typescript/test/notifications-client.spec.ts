import axios from 'axios';
import { NotificationClient } from '../src/notifications';
import { NotificationType } from '../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationClient', () => {
  let client: NotificationClient;
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
    client = new NotificationClient({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates notification', async () => {
    const payload = {
      id: 'n1',
      recipientWallet: '0xabc',
      type: NotificationType.SYSTEM,
      title: 'Notice',
      message: 'hello',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAxiosInstance.post.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await client.create({
      recipientWallet: '0xabc',
      type: NotificationType.SYSTEM,
      title: 'Notice',
      message: 'hello',
    });

    expect(result).toEqual(payload);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/notifications', {
      recipientWallet: '0xabc',
      type: NotificationType.SYSTEM,
      title: 'Notice',
      message: 'hello',
    });
  });

  it('gets unread count', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: { unreadCount: 3 } },
    });

    const count = await client.getUnreadCount();
    expect(count).toBe(3);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/notifications/unread-count');
  });
});
