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
 * Agent Tier (Legacy - use VerificationTier for new code)
 */
export enum Tier {
  UNVERIFIED = 'Unverified',
  BASIC = 'Basic',
  ADVANCED = 'Advanced',
  PREMIUM = 'Premium',
}

/**
 * Verification Tier
 * @spec ADRL-0003
 */
export enum VerificationTier {
  TIER_1 = 'tier_1', // Easy: API calls, data retrieval
  TIER_2 = 'tier_2', // Medium: Data analysis, code generation
  TIER_3 = 'tier_3', // Hard: Strategic decisions, negotiations
  TIER_4 = 'tier_4', // Very Hard: Autonomous trading, security audits
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
 * Bid Status
 * @spec ADRL-0003
 */
export enum BidStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

/**
 * Payment Type
 * @spec ADRL-0003
 */
export enum PaymentType {
  ESCROW_DEPOSIT = 'escrow_deposit',
  PAYMENT = 'payment',
  REFUND = 'refund',
  FEE = 'fee',
  DISPUTE_PAYOUT = 'dispute_payout',
}

/**
 * Payment Status
 * @spec ADRL-0003
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * Dispute Status
 * @spec ADRL-0003
 */
export enum DisputeStatus {
  OPEN = 'open',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
}

/**
 * Dispute Resolution
 * @spec ADRL-0003
 */
export enum DisputeResolution {
  FULL_REFUND = 'full_refund',
  PARTIAL_REFUND = 'partial_refund',
  FULL_PAYMENT = 'full_payment',
  PARTIAL_PAYMENT = 'partial_payment',
  SPLIT = 'split',
}

/**
 * Assignment Status
 * @spec ADRL-0003
 */
export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

/**
 * Verification Method
 * @spec ADRL-0003
 */
export enum VerificationMethod {
  AUTOMATED = 'automated',
  ZK_PROOF = 'zk_proof',
  AI_JUDGE = 'ai_judge',
  PEER_REVIEW = 'peer_review',
  TEE = 'tee',
  HUMAN = 'human',
}

/**
 * Reputation Event Type
 * @spec ADRL-0003
 */
export enum ReputationEventType {
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  VERIFICATION_PASSED = 'verification_passed',
  VERIFICATION_FAILED = 'verification_failed',
  DISPUTE_WON = 'dispute_won',
  DISPUTE_LOST = 'dispute_lost',
  EARLY_DELIVERY = 'early_delivery',
  LATE_DELIVERY = 'late_delivery',
  STAKE_INCREASED = 'stake_increased',
  STAKE_DECREASED = 'stake_decreased',
}

/**
 * Deliverable Type
 * @spec ADRL-0003
 */
export enum DeliverableType {
  TEXT = 'text',
  CODE = 'code',
  DATA = 'data',
  DOCUMENT = 'document',
  IMAGE = 'image',
  MODEL = 'model',
  PROOF = 'proof',
  OTHER = 'other',
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
 * Resolve Dispute (Legacy - for backward compatibility)
 * @deprecated Use ResolveDisputeDto from ADRL-0003 instead
 */
export interface LegacyResolveDisputeDto {
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

// ============================================================
// ADRL-0003: Core Domain Types
// ============================================================

/**
 * Agent Stats
 * @spec ADRL-0003
 */
export interface AgentStats {
  completionRate: number;
  verificationPassRate: number;
  averageQualityScore: number;
  disputeWinRate: number;
  timelinessRate: number;
  responsivenessScore: number;
  stakingConsistency: number;
}

/**
 * Agent
 * @spec ADRL-0003
 */
export interface Agent {
  id: string;
  walletAddress: string;
  displayName?: string;
  description?: string;
  capabilities: string[];
  verificationTiers: VerificationTier[];
  reputationScore: number;
  totalTasksCompleted: number;
  totalEarnings: string;
  stakingAmount: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  stats?: AgentStats;
}

/**
 * Selection Criteria
 * @spec ADRL-0003
 */
export interface SelectionCriteria {
  method: 'lowest_price' | 'reputation_weighted' | 'custom_score';
  weights?: {
    price: number;
    reputation: number;
    deliveryTime: number;
  };
  minReputation?: number;
  maxDeliveryTime?: number;
}

/**
 * Task (Core)
 * @spec ADRL-0003
 */
export interface CoreTask {
  id: string;
  requesterId: string;
  title: string;
  description: string;
  requirements: Record<string, unknown>;
  acceptanceCriteria: Record<string, unknown>;
  verificationTier: string;
  deadline?: Date;
  budget: string;
  tokenAddress: string;
  selectionCriteria: SelectionCriteria;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bid
 * @spec ADRL-0003
 */
export interface Bid {
  id: string;
  taskId: string;
  agentId: string;
  price: string;
  estimatedDurationHours: number;
  proposal?: string;
  status: BidStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Bid DTO
 * @spec ADRL-0003
 */
export interface CreateBidDto {
  taskId: string;
  agentId: string;
  price: string;
  estimatedDurationHours: number;
  proposal?: string;
}

/**
 * Task Assignment
 * @spec ADRL-0003
 */
export interface TaskAssignment {
  id: string;
  taskId: string;
  agentId: string;
  bidId: string;
  escrowTxHash?: string;
  startedAt?: Date;
  deadline?: Date;
  completedAt?: Date;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Deliverable
 * @spec ADRL-0003
 */
export interface Deliverable {
  id: string;
  assignmentId: string;
  type: DeliverableType;
  content?: string;
  ipfsHash?: string;
  metadata: Record<string, unknown>;
  submittedAt: Date;
}

/**
 * Payment (Core)
 * @spec ADRL-0003
 */
export interface CorePayment {
  id: string;
  assignmentId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress: string;
  txHash?: string;
  type: PaymentType;
  feeAmount?: string;
  status: PaymentStatus;
  createdAt: Date;
  confirmedAt?: Date;
}

/**
 * Create Payment DTO
 * @spec ADRL-0003
 */
export interface CreatePaymentDto {
  assignmentId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress: string;
  type: PaymentType;
}

/**
 * Dispute (Core)
 * @spec ADRL-0003
 */
export interface CoreDispute {
  id: string;
  assignmentId: string;
  initiatorId: string;
  reason: string;
  evidence: Record<string, unknown>;
  status: DisputeStatus;
  resolution?: DisputeResolution;
  arbitratorId?: string;
  stakeAmount: string;
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * Create Dispute DTO
 * @spec ADRL-0003
 */
export interface CreateDisputeDto {
  assignmentId: string;
  reason: string;
  evidence: Record<string, unknown>;
}

/**
 * Resolve Dispute DTO
 * @spec ADRL-0003
 */
export interface ResolveDisputeDto {
  resolution: DisputeResolution;
  arbitratorId?: string;
}

/**
 * Notification Type
 * @spec zkest-core notifications module
 */
export enum NotificationType {
  TASK = 'task',
  DISPUTE = 'dispute',
  PAYMENT = 'payment',
  SYSTEM = 'system',
}

/**
 * Notification (Core)
 * @spec zkest-core notifications module
 */
export interface CoreNotification {
  id: string;
  recipientWallet: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, string | number | boolean>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Notification DTO
 * @spec zkest-core notifications module
 */
export interface CreateNotificationDto {
  recipientWallet: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Ledger Reference Type
 * @spec zkest-core ledger module
 */
export enum LedgerReferenceType {
  ESCROW = 'escrow',
  PAYMENT = 'payment',
  DISPUTE = 'dispute',
  FEE = 'fee',
  ADJUSTMENT = 'adjustment',
}

/**
 * Ledger Direction
 * @spec zkest-core ledger module
 */
export enum LedgerDirection {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

/**
 * Ledger Status
 * @spec zkest-core ledger module
 */
export enum LedgerStatus {
  PENDING = 'pending',
  POSTED = 'posted',
  FAILED = 'failed',
}

/**
 * Ledger Entry (Core)
 * @spec zkest-core ledger module
 */
export interface CoreLedgerEntry {
  id: string;
  referenceType: LedgerReferenceType;
  referenceId: string;
  fromAddress?: string;
  toAddress?: string;
  tokenAddress: string;
  amount: string;
  direction: LedgerDirection;
  status: LedgerStatus;
  batchId?: string;
  metadata?: Record<string, string | number | boolean>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Ledger Entry DTO
 * @spec zkest-core ledger module
 */
export interface CreateLedgerEntryDto {
  referenceType: LedgerReferenceType;
  referenceId: string;
  fromAddress?: string;
  toAddress?: string;
  tokenAddress: string;
  amount: string;
  direction: LedgerDirection;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Admin dashboard metrics
 * @spec zkest-core admin module
 */
export interface AdminDashboardMetrics {
  totals: {
    agents: number;
    activeAgents: number;
    tasks: number;
    escrows: number;
    disputes: number;
    payments: number;
  };
  updatedAt: string;
}

/**
 * Admin recent activity payload
 * @spec zkest-core admin module
 */
export interface AdminRecentActivity {
  recentTasks: Record<string, unknown>[];
  recentEscrows: Record<string, unknown>[];
  recentDisputes: Record<string, unknown>[];
  recentPayments: Record<string, unknown>[];
}

/**
 * Ledger batch process result
 * @spec zkest-core ledger module
 */
export interface LedgerBatchResult {
  batchId: string;
  processedCount: number;
}

/**
 * Ledger summary payload
 * @spec zkest-core ledger module
 */
export interface LedgerSummary {
  totalEntries: number;
  byStatus: Record<string, number>;
  postedVolume: string;
}

/**
 * Reputation Event
 * @spec ADRL-0003
 */
export interface ReputationEvent {
  id: string;
  agentId: string;
  taskId: string;
  eventType: ReputationEventType;
  scoreChange: number;
  newScore: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Proof Data
 * @spec ADRL-0003
 */
export interface ProofData {
  proof: string;
  publicInputs: string[];
  verificationKey: string;
  circuitType: 'snark' | 'stark';
}

/**
 * Verification (Core)
 * @spec ADRL-0003
 */
export interface CoreVerification {
  id: string;
  assignmentId: string;
  method: VerificationMethod;
  result: VerificationResultType;
  score?: number;
  proofData?: ProofData;
  verifiedBy?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Verification Result Type
 */
export enum VerificationResultType {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * Pagination Query
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page?: number;
  limit?: number;
}

/**
 * Filter DTOs
 */
export interface TaskFilterDto extends PaginationQuery {
  status?: TaskStatus;
  requesterId?: string;
  agentId?: string;
  verificationTier?: VerificationTier;
}

export interface BidFilterDto extends PaginationQuery {
  taskId?: string;
  agentId?: string;
  status?: BidStatus;
}

export interface PaymentFilterDto extends PaginationQuery {
  assignmentId?: string;
  status?: PaymentStatus;
  type?: PaymentType;
  fromAddress?: string;
  toAddress?: string;
}

export interface DisputeFilterDto extends PaginationQuery {
  assignmentId?: string;
  initiatorId?: string;
  arbitratorId?: string;
  status?: DisputeStatus;
}

export interface NotificationFilterDto extends PaginationQuery {
  recipientWallet?: string;
  type?: NotificationType;
  isRead?: boolean;
}

export interface LedgerFilterDto extends PaginationQuery {
  status?: LedgerStatus;
  referenceType?: LedgerReferenceType;
  batchId?: string;
}

// ============================================================
// Agent Client Types
// ============================================================

/**
 * Agent Tier (alias for backward compatibility)
 */
export type AgentTier = Tier;

/**
 * Agent Skill
 */
export interface AgentSkill {
  id: string;
  agentId: string;
  category: string;
  evidenceUrl?: string;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  reviewedAt?: Date;
  reviewerId?: string;
  createdAt: Date;
}

/**
 * Create Agent DTO
 */
export interface CreateAgentDto {
  publicKey: string;
  name: string;
  description?: string;
  skills?: Array<{ category: string; evidenceUrl?: string }>;
}

/**
 * Update Agent DTO
 */
export interface UpdateAgentDto {
  name?: string;
  description?: string;
}

/**
 * Agent Filter DTO
 */
export interface AgentFilterDto extends PaginationQuery {
  isActive?: boolean;
  minReputation?: number;
  tier?: AgentTier;
}

/**
 * Add Skill DTO
 */
export interface AddSkillDto {
  category: string;
  evidenceUrl?: string;
}

// ============================================================
// Task Client Types
// ============================================================

/**
 * Create Task DTO
 */
export interface CreateTaskDto {
  title: string;
  description: string;
  requirements?: Record<string, unknown>;
  budget: string;
  tokenAddress?: string;
  deadline?: Date;
  verificationTier?: VerificationTier;
  selectionCriteria?: SelectionCriteria;
}

/**
 * Update Task DTO
 */
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  requirements?: Record<string, unknown>;
  budget?: string;
  deadline?: Date;
}
