/**
 * Agent SDK Types
 * @spec ADRL-0004, ADRL-0005
 */

import { InternalAxiosRequestConfig } from 'axios';

/**
 * Axios retry configuration extension
 */
export interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

/**
 * Verification Status
 */
export enum VerificationStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  MORE_INFO_REQUESTED = 'MoreInfoRequested',
}

/**
 * Agent Tier
 */
export enum Tier {
  UNVERIFIED = 'Unverified',
  BASIC = 'Basic',
  ADVANCED = 'Advanced',
  PREMIUM = 'Premium',
}

/**
 * Escrow Status
 */
export enum EscrowStatus {
  PENDING = 'Pending',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  DISPUTED = 'Disputed',
}

/**
 * Verification Request
 */
export interface VerificationRequest {
  id: string;
  agentId: string;
  skill: string;
  evidenceUrl: string;
  status: VerificationStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  rejectionReason?: string;
}

/**
 * Agent Metrics
 */
export interface AgentMetrics {
  agentId: string;
  tier: Tier;
  completedTasks: number;
  totalRating: number;
  ratingCount: number;
  reputationScore: number;
  verifiedSkills: string[];
  averageRating: number;
}

/**
 * Verification Submission
 */
export interface CreateVerificationDto {
  agentId: string;
  skill: string;
  evidenceUrl: string;
}

/**
 * Verification Update
 */
export interface UpdateVerificationDto {
  status: VerificationStatus.APPROVED | VerificationStatus.REJECTED;
  rejectionReason?: string;
}

/**
 * Reputation Update
 */
export interface UpdateReputationDto {
  rating: number; // 1-5
  onTime: boolean;
  disputed: boolean;
}

/**
 * Escrow
 */
export interface Escrow {
  id: string;
  taskId: string;
  clientWallet: string;
  agentWallet: string;
  amount: string;
  status: EscrowStatus;
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
  agentConfirmed?: boolean;
  clientConfirmed?: boolean;
}

/**
 * Create Escrow
 */
export interface CreateEscrowDto {
  taskId: string;
  agentWallet: string;
  amount: string;
  deadline: Date;
}

/**
 * Dispute
 */
export interface Dispute {
  id: string;
  escrowId: string;
  reason: string;
  evidenceUrl?: string;
  raisedBy: string;
  status: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * Create Dispute
 */
export interface CreateDisputeDto {
  reason: string;
  evidenceUrl?: string;
}

/**
 * Resolve Dispute
 */
export interface ResolveDisputeDto {
  resolution: string;
  winner: 'client' | 'agent';
}

/**
 * Verification Result
 */
export interface VerificationResult {
  valid: boolean;
  score?: number;
  feedback?: string;
  evidence?: string;
}

/**
 * Task
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budget: string;
  deadline: Date;
  status: string;
  createdAt: Date;
}

/**
 * SDK Configuration
 */
export interface SDKConfig {
  apiUrl: string;
  wsUrl?: string;
  agentId: string;
  privateKey: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Verification Stream Event
 */
export interface VerificationStreamEvent {
  type: 'verification_submitted' | 'verification_approved' | 'verification_rejected' | 'tier_updated';
  data: VerificationRequest | TierUpdateEvent;
}

/**
 * Tier Update Event
 */
export interface TierUpdateEvent {
  agentId: string;
  previousTier: Tier;
  newTier: Tier;
  timestamp: Date;
}

/**
 * Dispute Raised Event
 */
export interface DisputeRaisedEvent {
  escrowId: string;
  disputeId: string;
  reason: string;
  raisedBy: string;
  timestamp: Date;
}

/**
 * Escrow Stream Event
 */
export interface EscrowStreamEvent {
  type: 'escrow_created' | 'escrow_confirmed' | 'escrow_completed' | 'dispute_raised';
  data: Escrow | DisputeRaisedEvent;
}

/**
 * API Response
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * API Error
 */
export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// ============================================================
// ADRL-0005: Decentralized Task Verification Types
// ============================================================

/**
 * Task Type
 */
export enum TaskType {
  CODE = 'Code',
  DATA_ANALYSIS = 'DataAnalysis',
  CONTENT_CREATION = 'ContentCreation',
  STRATEGY = 'Strategy',
  RESEARCH = 'Research',
}

/**
 * Task Status
 */
export enum TaskStatus {
  CREATED = 'Created',
  ASSIGNED = 'Assigned',
  PENDING_VERIFICATION = 'PendingVerification',
  UNDER_VERIFICATION = 'UnderVerification',
  VERIFIED = 'Verified',
  REJECTED = 'Rejected',
  APPROVED = 'Approved',
  DISPUTED = 'Disputed',
  COMPLETED = 'Completed',
  REFUNDED = 'Refunded',
}

/**
 * Verification Evidence for Task
 */
export interface TaskVerificationEvidence {
  verifier: string;
  approved: boolean;
  reasoningIpfsHash: string;
  confidenceScore: number; // 0-100
  timestamp: Date;
}

/**
 * Task Verification
 */
export interface TaskVerification {
  id: string;
  taskId: string;
  requesterId: string;
  performerId: string;
  taskType: TaskType;
  resultIpfsHash: string;
  testScriptIpfsHash?: string;
  rewardAmount: string;
  verificationFeeRate: number; // 1-50%
  verifierFeeRatio: number; // 0-100%
  status: TaskStatus;
  requesterApproved: boolean;
  autoTestPassed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Submit Task Verification
 */
export interface SubmitTaskVerificationDto {
  verifierAddress: string;
  approved: boolean;
  reasoning: string;
  confidenceScore: number; // 0-100
  evidenceIpfsHash?: string;
  testResults?: object;
}

/**
 * Consensus Result
 */
export interface ConsensusResult {
  approved: boolean;
  approvalRatio: number;
  totalVerifications: number;
  approvalCount: number;
  quorumRatio: number;
}

/**
 * Verifier Metrics
 */
export interface VerifierMetrics {
  verifierId: string;
  totalVerifications: number;
  correctVerifications: number;
  wrongVerifications: number;
  accuracy: number; // 0-100
  independenceScore: number; // 0-100
  totalEarned: string;
  averageResponseTime: number; // seconds
  rank?: number;
}

/**
 * Stake Info
 */
export interface StakeInfo {
  amount: string;
  timestamp: Date;
  unlockTime?: Date;
  locked: boolean;
}

/**
 * Slash Reason
 */
export enum SlashReason {
  FRAUD = 'Fraud',
  INACCURATE = 'Inaccurate',
  LAZY = 'Lazy',
}

/**
 * Token Reward Calculation
 */
export interface TokenRewardCalculation {
  mintingReward: string;
  feeReward: string;
  accuracyBonus: string; // percentage
  timelinessBonus: string; // percentage
  independenceBonus: string; // percentage
  totalReward: string;
}

/**
 * Reward Distribution
 */
export interface RewardDistribution {
  taskId: string;
  performerReward: string;
  verifierRewards: Array<{
    verifier: string;
    reward: string;
  }>;
  totalDistributed: string;
}
