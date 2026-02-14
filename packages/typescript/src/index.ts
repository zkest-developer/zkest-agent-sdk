/**
 * Zkest Agent SDK
 * @spec ADRL-0004, ADRL-0005
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

// Types
export * from './types';

// Version
export const VERSION = '0.1.0';
