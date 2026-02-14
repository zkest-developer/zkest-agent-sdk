/**
 * Test Runner Tests
 * @spec ADRL-0004
 */

import { TestRunner } from '../src/verification/test-runner';
import { spawn } from 'child_process';

// Mock child_process
jest.mock('child_process');
const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('TestRunner', () => {
  let runner: TestRunner;

  beforeEach(() => {
    runner = new TestRunner();
    jest.clearAllMocks();
  });

  afterEach(() => {
    runner.stopAllTests();
  });

  describe('runTest', () => {
    it('should run a test successfully', async () => {
      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('Test output');
            }
          }),
        },
        stderr: {
          on: jest.fn(),
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: jest.fn(),
      };

      mockedSpawn.mockReturnValue(mockChild as any);

      const result = await runner.runTest('test-1', {
        command: 'npm',
        args: ['test'],
      });

      expect(result.valid).toBe(true);
      expect(result.score).toBe(100);
      expect(mockedSpawn).toHaveBeenCalledWith('npm', ['test'], expect.any(Object));
    });

    it('should handle test failure', async () => {
      const mockChild = {
        stdout: {
          on: jest.fn(),
        },
        stderr: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('Test failed');
            }
          }),
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10);
          }
        }),
        kill: jest.fn(),
      };

      mockedSpawn.mockReturnValue(mockChild as any);

      const result = await runner.runTest('test-1', {
        command: 'npm',
        args: ['test'],
      });

      expect(result.valid).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('runTests', () => {
    it('should run multiple tests', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: jest.fn(),
      };

      mockedSpawn.mockReturnValue(mockChild as any);

      const tests = new Map([
        ['test-1', { command: 'npm', args: ['test'] }],
        ['test-2', { command: 'npm', args: ['test:watch'] }],
      ]);

      const results = await runner.runTests(tests);

      expect(results.size).toBe(2);
      expect(results.get('test-1')?.valid).toBe(true);
      expect(results.get('test-2')?.valid).toBe(true);
    });
  });

  describe('stopTest', () => {
    it('should stop a running test', () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
      };

      mockedSpawn.mockReturnValue(mockChild as any);

      runner.runTest('test-1', { command: 'npm', args: ['test'] });

      const stopped = runner.stopTest('test-1');

      expect(stopped).toBe(true);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('parseTestScore', () => {
    it('should parse score from test output', () => {
      const output = 'Tests passed: 8/10 (score: 80)';
      const score = TestRunner.parseTestScore(output);
      expect(score).toBe(80);
    });

    it('should parse coverage percentage', () => {
      const output = 'Coverage: 95%';
      const score = TestRunner.parseTestScore(output);
      expect(score).toBe(95);
    });

    it('should parse passed/total ratio', () => {
      const output = 'passed: 45 / 50';
      const score = TestRunner.parseTestScore(output);
      expect(score).toBe(90);
    });
  });

  describe('createNpmTestConfig', () => {
    it('should create npm test config', () => {
      const config = TestRunner.createNpmTestConfig('test', '/path/to/project');

      expect(config.command).toBeDefined();
      expect(config.args).toEqual(['run', 'test']);
      expect(config.cwd).toBe('/path/to/project');
    });
  });
});
