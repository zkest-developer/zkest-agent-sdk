/**
 * Result Validator Tests
 * @spec ADRL-0004
 */

import { ResultValidator } from '../src/requester/result-validator';

describe('ResultValidator', () => {
  let validator: ResultValidator;

  beforeEach(() => {
    validator = new ResultValidator();
  });

  describe('validate', () => {
    it('should pass validation when no rules configured', async () => {
      const result = await validator.validate({});

      expect(result.valid).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should validate with custom rules', async () => {
      validator.addRule({
        name: 'has-title',
        validate: (result) => !!result.title,
      });

      const validResult = await validator.validate({ title: 'Test' });
      expect(validResult.valid).toBe(true);
      expect(validResult.score).toBe(100);

      const invalidResult = await validator.validate({});
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.score).toBe(0);
    });

    it('should handle weighted rules', async () => {
      validator.addRule({
        name: 'rule-1',
        validate: () => true,
        weight: 2,
      });

      validator.addRule({
        name: 'rule-2',
        validate: () => false,
        weight: 1,
      });

      const result = await validator.validate({});

      // Total weight: 3, passed weight: 2, score: 67
      expect(result.valid).toBe(false);
      expect(result.score).toBe(67);
    });
  });

  describe('validateMany', () => {
    it('should validate multiple results', async () => {
      validator.addRule({
        name: 'has-title',
        validate: (result) => !!result.title,
      });

      const results = new Map([
        ['task-1', { title: 'Task 1' }],
        ['task-2', {}],
      ]);

      const validationResults = await validator.validateMany(results);

      expect(validationResults.get('task-1')?.valid).toBe(true);
      expect(validationResults.get('task-2')?.valid).toBe(false);
    });
  });

  describe('helper methods', () => {
    describe('requiredFields', () => {
      it('should validate required fields', async () => {
        const rule = ResultValidator.requiredFields(['title', 'description']);
        validator.addRule(rule);

        const validResult = await validator.validate({
          title: 'Test',
          description: 'Test description',
        });
        expect(validResult.valid).toBe(true);

        const invalidResult = await validator.validate({ title: 'Test' });
        expect(invalidResult.valid).toBe(false);
      });
    });

    describe('fileType', () => {
      it('should validate file types', async () => {
        const rule = ResultValidator.fileType(['pdf', 'jpg', 'png']);
        validator.addRule(rule);

        const validResult = await validator.validate({
          fileUrl: 'https://example.com/file.pdf',
        });
        expect(validResult.valid).toBe(true);

        const invalidResult = await validator.validate({
          fileUrl: 'https://example.com/file.exe',
        });
        expect(invalidResult.valid).toBe(false);
      });
    });

    describe('fileSize', () => {
      it('should validate file size', async () => {
        const rule = ResultValidator.fileSize(1024 * 1024); // 1MB
        validator.addRule(rule);

        const validResult = await validator.validate({ fileSize: 500000 });
        expect(validResult.valid).toBe(true);

        const invalidResult = await validator.validate({ fileSize: 2 * 1024 * 1024 });
        expect(invalidResult.valid).toBe(false);
      });
    });

    describe('scoreThreshold', () => {
      it('should validate score threshold', async () => {
        const rule = ResultValidator.scoreThreshold(80);
        validator.addRule(rule);

        const validResult = await validator.validate({ score: 85 });
        expect(validResult.valid).toBe(true);

        const invalidResult = await validator.validate({ score: 75 });
        expect(invalidResult.valid).toBe(false);
      });
    });

    describe('freshness', () => {
      it('should validate timestamp freshness', async () => {
        const rule = ResultValidator.freshness(60000); // 1 minute
        validator.addRule(rule);

        const validResult = await validator.validate({
          timestamp: new Date().toISOString(),
        });
        expect(validResult.valid).toBe(true);

        const invalidResult = await validator.validate({
          timestamp: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        });
        expect(invalidResult.valid).toBe(false);
      });
    });

    describe('schema', () => {
      it('should validate schema', async () => {
        const rule = ResultValidator.schema({
          title: 'string',
          count: 'number',
        });
        validator.addRule(rule);

        const validResult = await validator.validate({
          title: 'Test',
          count: 5,
        });
        expect(validResult.valid).toBe(true);

        const invalidResult = await validator.validate({
          title: 'Test',
          count: '5',
        });
        expect(invalidResult.valid).toBe(false);
      });
    });
  });

  describe('rule management', () => {
    it('should add and remove rules', () => {
      const rule = {
        name: 'test-rule',
        validate: () => true,
      };

      validator.addRule(rule);
      expect(validator.getRules()).toHaveLength(1);

      validator.removeRule('test-rule');
      expect(validator.getRules()).toHaveLength(0);
    });

    it('should clear all rules', () => {
      validator.addRule({ name: 'rule-1', validate: () => true });
      validator.addRule({ name: 'rule-2', validate: () => true });

      expect(validator.getRules()).toHaveLength(2);

      validator.clearRules();
      expect(validator.getRules()).toHaveLength(0);
    });
  });
});
