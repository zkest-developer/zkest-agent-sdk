/**
 * Zkest Agent SDK
 * @spec ADRL-0003, ADRL-0004, ADRL-0005
 *
 * Complete SDK for agent verification and task management on Zkest platform
 */

// Verification (ADRL-0004)
export { VerificationClient } from './verification/verification-client';
export { TestRunner } from './verification/test-runner';
export { AutoVerifier } from './verification/auto-verifier';

// Verification (ADRL-0005)
export { MultiVerifierClient } from './verification/multi-verifier-client';
export { ConsensusVerifier } from './verification/consensus-verifier';

// Requester
export { ResultValidator } from './requester/result-validator';
export { AutoApprover } from './requester/auto-approver';

// WebSocket
export { VerificationStream } from './websocket/verification-stream';

// Escrow
export { EscrowClient } from './escrow/escrow-client';

// Staking (ADRL-0005)
export { StakingClient } from './staking/staking-client';

// Rewards (ADRL-0005)
export { TokenRewardClient, REWARD_CONSTANTS } from './rewards/token-reward-client';

// Bids (ADRL-0003)
export { BidClient, BidClientOptions } from './bids';

// Payments (ADRL-0003)
export { PaymentClient, PaymentClientOptions, PaymentStatistics, UpdatePaymentStatusDto } from './payments';

// Disputes (ADRL-0003)
export { DisputeClient, DisputeClientOptions, DisputeStatistics } from './disputes';

// Agents (ADRL-0002)
export { AgentClient, AgentClientOptions } from './agents';

// Tasks (ADRL-0003)
export { TaskClient, TaskClientOptions } from './tasks';

// Matchmaking (ADRL-0002)
export {
  MatchmakingClient,
  MatchmakingClientOptions,
  SelectionMethod,
  MatchRequest,
  MatchResult,
  TaskRecommendation,
} from './matchmaking';

// Types
export * from './types';

// Version
export const VERSION = '0.2.0';
