/**
 * Test Runner
 * @spec ADRL-0004
 *
 * Automated test execution for verification tasks
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { VerificationResult } from '../types';

/**
 * Test Configuration
 */
export interface TestConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Test Result with metadata
 */
export interface TestExecutionResult extends VerificationResult {
  duration: number;
  stdout?: string;
  stderr?: string;
}

/**
 * Test Runner Events
 */
export interface TestRunnerEvents {
  'test:start': (testId: string) => void;
  'test:complete': (testId: string, result: TestExecutionResult) => void;
  'test:timeout': (testId: string) => void;
  'test:error': (testId: string, error: Error) => void;
}

/**
 * Test Runner
 *
 * Executes automated tests for verification tasks
 */
export class TestRunner extends EventEmitter {
  private runningTests: Map<string, ChildProcess> = new Map();
  private defaultTimeout: number;

  constructor(timeout: number = 30000) {
    super();
    this.defaultTimeout = timeout;
  }

  /**
   * Run a test
   * @param testId Unique test identifier
   * @param config Test configuration
   * @returns Test result
   */
  async runTest(testId: string, config: TestConfig): Promise<TestExecutionResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      this.emit('test:start', testId);

      let stdout = '';
      let stderr = '';

      const child = spawn(config.command, config.args ?? [], {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
      });

      this.runningTests.set(testId, child);

      const timeout = config.timeout ?? this.defaultTimeout;
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGKILL');
        this.emit('test:timeout', testId);
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.runningTests.delete(testId);

        const duration = Date.now() - startTime;
        const passed = code === 0;

        const result: TestExecutionResult = {
          valid: passed,
          score: passed ? 100 : 0,
          feedback: passed ? 'All tests passed' : `Tests failed with exit code ${code}`,
          evidence: stderr || stdout,
          duration,
          stdout,
          stderr,
        };

        this.emit('test:complete', testId, result);
        resolve(result);
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.runningTests.delete(testId);

        const duration = Date.now() - startTime;
        const result: TestExecutionResult = {
          valid: false,
          score: 0,
          feedback: `Test execution failed: ${error.message}`,
          evidence: error.message,
          duration,
          stderr: error.message,
        };

        this.emit('test:error', testId, error);
        reject(result);
      });
    });
  }

  /**
   * Run multiple tests in parallel
   * @param tests Map of test IDs to configurations
   * @returns Map of test results
   */
  async runTests(tests: Map<string, TestConfig>): Promise<Map<string, TestExecutionResult>> {
    const promises = Array.from(tests.entries()).map(([testId, config]) =>
      this.runTest(testId, config).catch((error) => error)
    );

    const results = await Promise.all(promises);
    const resultMap = new Map<string, TestExecutionResult>();

    Array.from(tests.keys()).forEach((testId, index) => {
      const result = results[index];
      resultMap.set(testId, {
        valid: result.valid ?? false,
        score: result.score ?? 0,
        feedback: result.feedback ?? 'Test failed',
        evidence: result.evidence,
        duration: result.duration ?? 0,
        stdout: result.stdout,
        stderr: result.stderr,
      });
    });

    return resultMap;
  }

  /**
   * Stop a running test
   * @param testId Test ID
   */
  stopTest(testId: string): boolean {
    const child = this.runningTests.get(testId);
    if (child) {
      child.kill('SIGKILL');
      this.runningTests.delete(testId);
      return true;
    }
    return false;
  }

  /**
   * Stop all running tests
   */
  stopAllTests(): void {
    this.runningTests.forEach((child) => {
      child.kill('SIGKILL');
    });
    this.runningTests.clear();
  }

  /**
   * Get count of running tests
   */
  getRunningTestCount(): number {
    return this.runningTests.size;
  }

  /**
   * Parse test output to extract score
   * @param output Test output
   * @returns Score (0-100)
   */
  static parseTestScore(output: string): number {
    // Look for common patterns in test output
    const patterns = [
      /score:\s*(\d+)/i,
      /coverage:\s*(\d+)%/i,
      /passed:\s*(\d+)\s*\/\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        if (pattern.toString().includes('passed')) {
          const passed = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          return total > 0 ? Math.round((passed / total) * 100) : 0;
        }
        return parseInt(match[1], 10);
      }
    }

    return 0;
  }

  /**
   * Parse JUnit XML output
   * @param xml JUnit XML string
   * @returns Test result
   */
  static parseJUnitXml(xml: string): VerificationResult {
    // Simple JUnit XML parser
    const testsMatch = xml.match(/tests="(\d+)"/);
    const failuresMatch = xml.match(/failures="(\d+)"/);
    const errorsMatch = xml.match(/errors="(\d+)"/);

    const tests = testsMatch ? parseInt(testsMatch[1], 10) : 0;
    const failures = failuresMatch ? parseInt(failuresMatch[1], 10) : 0;
    const errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 0;

    const passed = tests - failures - errors;
    const score = tests > 0 ? Math.round((passed / tests) * 100) : 0;

    return {
      valid: failures === 0 && errors === 0,
      score,
      feedback: `${passed}/${tests} tests passed`,
    };
  }

  /**
   * Create a test configuration for npm scripts
   * @param scriptName NPM script name
   * @param cwd Working directory
   * @returns Test configuration
   */
  static createNpmTestConfig(scriptName: string, cwd?: string): TestConfig {
    return {
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args: ['run', scriptName],
      cwd,
    };
  }

  /**
   * Create a test configuration for yarn scripts
   * @param scriptName Yarn script name
   * @param cwd Working directory
   * @returns Test configuration
   */
  static createYarnTestConfig(scriptName: string, cwd?: string): TestConfig {
    return {
      command: process.platform === 'win32' ? 'yarn.cmd' : 'yarn',
      args: ['run', scriptName],
      cwd,
    };
  }
}

