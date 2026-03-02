import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  ApiResponse,
  CoreLedgerEntry,
  CreateLedgerEntryDto,
  LedgerBatchResult,
  LedgerFilterDto,
  LedgerSummary,
  RetryableAxiosRequestConfig,
} from '../types';

export interface LedgerClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ProcessLedgerBatchDto {
  limit?: number;
}

export class LedgerClient {
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(options: LedgerClientOptions) {
    this.maxRetries = options.maxRetries ?? 3;

    const config: AxiosRequestConfig = {
      baseURL: options.baseUrl,
      timeout: options.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (options.apiKey) {
      config.headers!['Authorization'] = `Bearer ${options.apiKey}`;
    }

    this.client = axios.create(config);

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as RetryableAxiosRequestConfig;

        if (!config || (config.__retryCount ?? 0) >= this.maxRetries) {
          return Promise.reject(error);
        }

        config.__retryCount = (config.__retryCount ?? 0) + 1;
        const delay = Math.pow(2, config.__retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.client.request(config);
      }
    );
  }

  async createEntry(dto: CreateLedgerEntryDto): Promise<CoreLedgerEntry> {
    const response = await this.client.post<ApiResponse<CoreLedgerEntry>>(
      '/ledger/entries',
      dto
    );
    return response.data.data;
  }

  async findEntries(
    filter?: LedgerFilterDto
  ): Promise<{ data: CoreLedgerEntry[]; total: number }> {
    const response = await this.client.get<{
      success: boolean;
      data: CoreLedgerEntry[];
      total: number;
    }>('/ledger/entries', {
      params: filter,
    });

    return {
      data: response.data.data,
      total: response.data.total,
    };
  }

  async processBatch(dto?: ProcessLedgerBatchDto): Promise<LedgerBatchResult> {
    const response = await this.client.post<ApiResponse<LedgerBatchResult>>(
      '/ledger/process-batch',
      dto ?? {}
    );
    return response.data.data;
  }

  async getSummary(): Promise<LedgerSummary> {
    const response = await this.client.get<ApiResponse<LedgerSummary>>(
      '/ledger/summary'
    );
    return response.data.data;
  }
}
