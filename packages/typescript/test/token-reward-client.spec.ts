/**
 * Token Reward Client Tests
 * @spec ADRL-0005
 */

import { TokenRewardClient, REWARD_CONSTANTS } from '../src/rewards/token-reward-client';

describe('TokenRewardClient', () => {
  let client: TokenRewardClient;

  beforeEach(() => {
    client = new TokenRewardClient({
      apiUrl: 'https://api.test.com',
    });
  });

  describe('calculateRewardLocally', () => {
    it('should calculate initial reward', () => {
      const reward = client['calculateRewardLocally'](0, '0');
      expect(reward).toBe(REWARD_CONSTANTS.INITIAL_REWARD);
    });

    it('should apply halving after period', () => {
      const reward = client['calculateRewardLocally'](REWARD_CONSTANTS.HALVING_PERIOD, '0');
      const expected = BigInt(REWARD_CONSTANTS.INITIAL_REWARD) / BigInt(2);
      expect(reward).toBe(expected.toString());
    });

    it('should apply supply adjustment', () => {
      const reward = client['calculateRewardLocally'](
        0,
        REWARD_CONSTANTS.SUPPLY_THRESHOLDS.TIER_1
      );
      const expected =
        (BigInt(REWARD_CONSTANTS.INITIAL_REWARD) *
          BigInt(REWARD_CONSTANTS.SUPPLY_FACTORS.TIER_1)) /
        BigInt(100);
      expect(reward).toBe(expected.toString());
    });

    it('should enforce minimum reward', () => {
      const reward = client['calculateRewardLocally'](
        1000000,
        REWARD_CONSTANTS.SUPPLY_THRESHOLDS.TIER_3
      );
      expect(reward).toBe(REWARD_CONSTANTS.MIN_REWARD);
    });
  });

  describe('calculateFeeReward', () => {
    it('should calculate fee reward per verifier', () => {
      const reward = client.calculateFeeReward('100000000000000000000', 10, 80, 5);

      // Task reward: 100 tokens
      // Fee pool: 100 * 10% = 10 tokens
      // Verifier pool: 10 * 80% = 8 tokens
      // Per verifier: 8 / 5 = 1.6 tokens
      const expected = BigInt('1600000000000000000'); // 1.6 tokens in wei

      expect(reward).toBe(expected.toString());
    });

    it('should handle edge case: 0 verifiers', () => {
      expect(() => {
        client.calculateFeeReward('100', 10, 80, 0);
      }).not.toThrow();
    });
  });
});
