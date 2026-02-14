/**
 * Result Validator
 * @spec ADRL-0004
 *
 * Validates task results before approval
 */

import { VerificationResult } from '../types';

/**
 * Validation Rule
 */
export interface ValidationRule {
  name: string;
  validate: (result: Record<string, unknown>) => boolean | Promise<boolean>;
  weight?: number;
}

/**
 * Validation Configuration
 */
export interface ValidationConfig {
  rules: ValidationRule[];
  threshold?: number;
}

/**
 * Result Validator
 *
 * Validates task results against configurable rules
 */
export class ResultValidator {
  private rules: ValidationRule[] = [];
  private threshold: number;

  constructor(config?: ValidationConfig) {
    this.rules = config?.rules ?? [];
    this.threshold = config?.threshold ?? 0.8;
  }

  /**
   * Add a validation rule
   * @param rule Validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a validation rule
   * @param name Rule name
   */
  removeRule(name: string): void {
    this.rules = this.rules.filter((rule) => rule.name !== name);
  }

  /**
   * Validate a result
   * @param result Task result
   * @returns Validation result
   */
  async validate(result: Record<string, unknown>): Promise<VerificationResult> {
    if (this.rules.length === 0) {
      return {
        valid: true,
        score: 100,
        feedback: 'No validation rules configured',
      };
    }

    const results: { name: string; passed: boolean; weight?: number }[] = [];

    for (const rule of this.rules) {
      try {
        const passed = await rule.validate(result);
        results.push({ name: rule.name, passed, weight: rule.weight ?? 1 });
      } catch (error) {
        results.push({
          name: rule.name,
          passed: false,
          weight: rule.weight ?? 1,
        });
      }
    }

    // Calculate weighted score
    const totalWeight = results.reduce((sum, r) => sum + (r.weight ?? 1), 0);
    const passedWeight = results.reduce((sum, r) => sum + (r.passed ? r.weight ?? 1 : 0), 0);
    const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

    const valid = score >= this.threshold * 100;
    const failedRules = results.filter((r) => !r.passed).map((r) => r.name);

    return {
      valid,
      score,
      feedback: valid
        ? 'All validation rules passed'
        : `Failed validation rules: ${failedRules.join(', ')}`,
    };
  }

  /**
   * Validate multiple results
   * @param results Map of task IDs to results
   * @returns Map of validation results
   */
  async validateMany(results: Map<string, Record<string, unknown>>): Promise<Map<string, VerificationResult>> {
    const validationResults = new Map<string, VerificationResult>();

    for (const [taskId, result] of results.entries()) {
      const validation = await this.validate(result);
      validationResults.set(taskId, validation);
    }

    return validationResults;
  }

  /**
   * Create common validation rules
   */

  /**
   * Create a required fields rule
   * @param fields Array of required field names
   * @returns Validation rule
   */
  static requiredFields(fields: string[]): ValidationRule {
    return {
      name: 'required-fields',
      validate: (result) => {
        return fields.every((field) => field in result && result[field] !== undefined && result[field] !== null);
      },
    };
  }

  /**
   * Create a file type rule
   * @param allowedTypes Array of allowed file extensions
   * @returns Validation rule
   */
  static fileType(allowedTypes: string[]): ValidationRule {
    return {
      name: 'file-type',
      validate: (result) => {
        if (!result.fileUrl) return false;
        const extension = result.fileUrl.split('.').pop()?.toLowerCase();
        return extension ? allowedTypes.includes(extension) : false;
      },
    };
  }

  /**
   * Create a file size rule
   * @param maxSizeBytes Maximum file size in bytes
   * @returns Validation rule
   */
  static fileSize(maxSizeBytes: number): ValidationRule {
    return {
      name: 'file-size',
      validate: (result) => {
        if (!result.fileSize) return false;
        return result.fileSize <= maxSizeBytes;
      },
    };
  }

  /**
   * Create a score threshold rule
   * @param threshold Minimum score
   * @returns Validation rule
   */
  static scoreThreshold(threshold: number): ValidationRule {
    return {
      name: 'score-threshold',
      validate: (result) => {
        if (result.score === undefined) return false;
        return result.score >= threshold;
      },
    };
  }

  /**
   * Create a custom rule
   * @param name Rule name
   * @param validate Validation function
   * @param weight Rule weight
   * @returns Validation rule
   */
  static custom(name: string, validate: (result: Record<string, unknown>) => boolean | Promise<boolean>, weight?: number): ValidationRule {
    return {
      name,
      validate,
      weight,
    };
  }

  /**
   * Create a time-based rule
   * @param maxAgeMs Maximum age in milliseconds
   * @returns Validation rule
   */
  static freshness(maxAgeMs: number): ValidationRule {
    return {
      name: 'freshness',
      validate: (result) => {
        if (!result.timestamp) return false;
        const age = Date.now() - new Date(result.timestamp).getTime();
        return age <= maxAgeMs;
      },
    };
  }

  /**
   * Create a schema validation rule
   * @param schema JSON schema
   * @returns Validation rule
   */
  static schema(schema: Record<string, string>): ValidationRule {
    return {
      name: 'schema',
      validate: (result) => {
        // Simple schema validation - in production, use a library like ajv
        for (const key in schema) {
          if (!(key in result)) return false;
          if (typeof result[key] !== schema[key]) return false;
        }
        return true;
      },
    };
  }

  /**
   * Get all registered rules
   */
  getRules(): ValidationRule[] {
    return [...this.rules];
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules = [];
  }
}
