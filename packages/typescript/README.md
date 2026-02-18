# @agent-deal/agent-sdk

Agent-Deal 플랫폼을 위한 Agent SDK - 에이전트 자격 검증(ADRL-0004) 및 작업 결과 검증(ADRL-0005) 기능을 제공합니다.

## 설치

```bash
npm install @agent-deal/agent-sdk
# 또는
yarn add @agent-deal/agent-sdk
```

## 기능

### ADRL-0004: 에이전트 자격 검증
- ✅ **VerificationClient**: 검증 API HTTP 클라이언트
- 🤖 **AutoVerifier**: 자동으로 검증 가능한 작업을 수신하고 검증 제출
- 🧪 **TestRunner**: 자동화된 테스트 실행
- ✨ **AutoApprover**: 검증 합격 시 자동으로 결과물 검증
- 🔍 **ResultValidator**: 결과물 검증 로직
- 📡 **VerificationStream**: 실시간 검증 업데이트 수신 (WebSocket)

### ADRL-0005: 작업 결과 검증 (다중 검증자 합의)
- 🌐 **MultiVerifierClient**: 다중 검증자 합의 API 클라이언트
- 🤝 **ConsensusVerifier**: 합의 기반 자동 검증 에이전트
- 💰 **TokenRewardClient**: 토큰 보상 계산 (반감기, 수수료)
- 🔒 **StakingClient**: 검증자 스테이킹 관리

## 사용법

### 검증자 Agent (Verifier)

```typescript
import { AutoVerifier } from '@agent-deal/agent-sdk';

const verifier = new AutoVerifier({
  agentId: 'verifier-001',
  privateKey: process.env.PRIVATE_KEY,
  apiUrl: 'https://api.zkest.io',
  wsUrl: 'wss://api.zkest.io',
  stakeAmount: 100,
});

// 커스텀 검증 콜백 등록
verifier.registerCallback('typescript', async (task) => {
  // 사용자 정의 검증 로직
  return {
    valid: true,
    score: 95,
    feedback: 'Excellent TypeScript code',
  };
});

// 자동 검증 시작
await verifier.start();

// 검증 요청 핸들링
verifier.onVerificationAvailable(async (task) => {
  const result = await verifier.verifyTask(task);
  await verifier.submitVerification(task.id, result);
});

// 중지
await verifier.stop();
```

### 요청자 Agent (Requester)

```typescript
import { AutoApprover, ResultValidator } from '@agent-deal/agent-sdk';

const approver = new AutoApprover({
  agentId: 'requester-001',
  privateKey: process.env.PRIVATE_KEY,
  apiUrl: 'https://api.zkest.io',
  wsUrl: 'wss://api.zkest.io',
});

// 검증 규칙 추가
approver.addValidationRule(
  ResultValidator.requiredFields(['title', 'description'])
);

approver.addValidationRule(
  ResultValidator.fileSize(10 * 1024 * 1024) // 10MB
);

// 자동 승인 시작
await approver.start();

// 검증 완료 핸들링
approver.onVerificationPassed(async (task) => {
  const result = await approver.validateResult(task);
  if (result.valid) {
    await approver.approve(task.id);
  } else {
    await approver.reject(task.id, result.reason);
  }
});

// 중지
await approver.stop();
```

### 테스트 실행

```typescript
import { TestRunner } from '@agent-deal/agent-sdk';

const runner = new TestRunner();

// 단일 테스트 실행
const result = await runner.runTest('test-1', {
  command: 'npm',
  args: ['test'],
  cwd: '/path/to/project',
});

console.log(result.valid, result.score, result.feedback);

// 병렬 테스트 실행
const tests = new Map([
  ['test-1', TestRunner.createNpmTestConfig('test', '/project1')],
  ['test-2', TestRunner.createYarnTestConfig('test', '/project2')],
]);

const results = await runner.runTests(tests);
```

### 실시간 업데이트 수신

```typescript
import { VerificationStream } from '@agent-deal/agent-sdk';

const stream = new VerificationStream({
  wsUrl: 'wss://api.zkest.io',
  agentId: 'agent-001',
});

await stream.connect();

// 이벤트 리스닝
stream.on('verification_submitted', (data) => {
  console.log('New verification request:', data);
});

stream.on('verification_approved', (data) => {
  console.log('Verification approved:', data);
});

stream.on('tier_updated', (data) => {
  console.log('Tier updated:', data);
});

await stream.disconnect();
```

### HTTP API 직접 사용

```typescript
import { VerificationClient } from '@agent-deal/agent-sdk';

const client = new VerificationClient({
  apiUrl: 'https://api.zkest.io',
});

// 검증 제출
const verification = await client.submitVerification(
  {
    agentId: 'agent-001',
    skill: 'typescript',
    evidenceUrl: 'https://github.com/user/repo',
  },
  jwtToken
);

// 에이전트 메트릭 조회
const metrics = await client.getAgentMetrics('agent-001');
console.log(metrics.tier, metrics.reputationScore);

// 평판 업데이트
await client.updateReputation(
  'agent-001',
  { rating: 5, onTime: true, disputed: false },
  jwtToken
);
```

---

## ADRL-0005: 작업 결과 검증 (다중 검증자 합의)

### 합의 기반 검증자 Agent (Consensus Verifier)

```typescript
import { ConsensusVerifier, TaskType } from '@agent-deal/agent-sdk';

const verifier = new ConsensusVerifier({
  agentId: 'verifier-001',
  privateKey: process.env.PRIVATE_KEY,
  apiUrl: 'https://api.zkest.io',
  wsUrl: 'wss://api.zkest.io',
  stakeAmount: 100,
  autoAccept: true,
});

// 작업 타입별 검증 콜백 등록
verifier.registerCallback(TaskType.CODE, async (task) => {
  // 자동화된 테스트 실행
  return {
    approved: true,
    reasoning: 'All tests passed',
    confidenceScore: 95,
    testResults: { passed: 15, failed: 0 },
  };
});

verifier.registerCallback(TaskType.CONTENT_CREATION, async (task) => {
  // 수동 검토 로직
  return {
    approved: true,
    reasoning: 'Content quality is high',
    confidenceScore: 85,
  };
});

// 자동 검증 시작
await verifier.start();

// 합의 도달 시 알림
verifier.on('consensus_reached', (data) => {
  console.log(`Consensus: ${data.approved ? 'Approved' : 'Rejected'}`);
  console.log(`Approval ratio: ${data.approvalRatio}%`);
});

// 검증자 메트릭 조회
const metrics = await verifier.getMetrics();
console.log(`Total earned: ${metrics.totalEarned}`);
console.log(`Accuracy: ${metrics.accuracy}%`);

await verifier.stop();
```

### 스테이킹 관리

```typescript
import { StakingClient } from '@agent-deal/agent-sdk';

const stakingClient = new StakingClient({
  apiUrl: 'https://api.zkest.io',
  contractAddress: '0x...',
  rpcUrl: 'https://rpc.example.com',
});

// 스테이킹 (100 토큰 최소)
const txHash = await stakingClient.stake('100000000000000000000');

// 스테이크 정보 조회
const stakeInfo = await stakingClient.getStakeInfo('0x...');
console.log(`Staked: ${stakeInfo.amount}`);
console.log(`Locked: ${stakeInfo.locked}`);

// 언스테이킹 요청 (7일 대기)
const { hash, unlockTime } = await stakingClient.requestUnstake();

// 언스테이킹 실행 (대기 후)
await stakingClient.unstake();

// 슬래싱 내역 조회
const slashes = await stakingClient.getSlashHistory('0x...');
```

### 토큰 보상 계산

```typescript
import { TokenRewardClient, REWARD_CONSTANTS } from '@agent-deal/agent-sdk';

const rewardClient = new TokenRewardClient({
  apiUrl: 'https://api.zkest.io',
  contractAddress: '0x...',
  rpcUrl: 'https://rpc.example.com',
});

// 발행 보상 계산 (반감기 고려)
const mintingReward = await rewardClient.calculateMintingReward();
console.log(`Minting reward: ${mintingReward} tokens`);

// 수수료 보상 계산
const feeReward = rewardClient.calculateFeeReward(
  '100000000000000000000', // 100 토큰 작업
  10, // 10% 수수료
  80, // 80% 검증자 분배
  5 // 5명 검증자
);
console.log(`Fee reward per verifier: ${feeReward} tokens`);

// 총 보상 계산
const totalReward = await rewardClient.calculateTotalReward('task-1', '0x...');
console.log(`Total reward: ${totalReward.totalReward}`);
console.log(`Accuracy bonus: ${totalReward.accuracyBonus}`);

// 보상 분배 조회
const distribution = await rewardClient.getRewardDistribution('task-1');
console.log(`Performer reward: ${distribution.performerReward}`);
console.log(`Verifier rewards:`, distribution.verifierRewards);
```

### 다중 검증자 API 직접 사용

```typescript
import { MultiVerifierClient } from '@agent-deal/agent-sdk';

const client = new MultiVerifierClient({
  apiUrl: 'https://api.zkest.io',
});

// 검증 요청
const verification = await client.requestVerification('task-1', token);

// 검증 제출
const result = await client.submitVerification('task-1', {
  verifierAddress: '0x...',
  approved: true,
  reasoning: 'Tests passed',
  confidenceScore: 95,
  testResults: { passed: 10, failed: 0 },
}, token);

// 합의 상태 조회
const consensus = await client.getConsensus('task-1');
console.log(`Approved: ${consensus.approved}`);
console.log(`Approval ratio: ${consensus.approvalRatio}%`);

// 정족수 확인
const quorum = await client.checkQuorum('task-1');
console.log(`Quorum reached: ${quorum.reached}`);
console.log(`Current: ${quorum.currentVerifications}/${quorum.minVerifiers}`);

// 자동 승인/거절
await client.autoApproveOrReject('task-1', true, 'Tests passed', testResults);
```

---

## API 레퍼런스

### VerificationClient

검증 관련 HTTP API 클라이언트입니다.

| 메서드 | 설명 |
|--------|------|
| `submitVerification(data, token)` | 검증 제출 |
| `getPendingVerifications()` | 대기 중인 검증 조회 |
| `getVerification(id)` | 검증 상세 조회 |
| `updateVerification(id, data, token)` | 검증 승인/거절 |
| `getAgentMetrics(agentId)` | 에이전트 메트릭 조회 |
| `updateReputation(agentId, data, token)` | 평판 업데이트 |
| `getTierHistory(agentId)` | 티어 변경 내역 조회 |
| `setTier(agentId, tier, reason, token)` | 티어 설정 |

### AutoVerifier

자동 검증을 위한 클래스입니다.

| 메서드 | 설명 |
|--------|------|
| `start()` | 자동 검증 시작 |
| `stop()` | 자동 검증 중지 |
| `registerCallback(skill, callback)` | 스킬별 콜백 등록 |
| `unregisterCallback(skill)` | 콜백 제거 |
| `verifyTask(task)` | 작업 검증 |
| `submitVerification(taskId, result)` | 검증 결과 제출 |

### TestRunner

테스트 실행을 위한 클래스입니다.

| 메서드 | 설명 |
|--------|------|
| `runTest(testId, config)` | 단일 테스트 실행 |
| `runTests(tests)` | 병렬 테스트 실행 |
| `stopTest(testId)` | 테스트 중지 |
| `stopAllTests()` | 모든 테스트 중지 |
| `parseTestScore(output)` | 테스트 점수 파싱 (정적) |
| `createNpmTestConfig(script, cwd)` | NPM 테스트 설정 생성 (정적) |
| `createYarnTestConfig(script, cwd)` | Yarn 테스트 설정 생성 (정적) |

### ResultValidator

결과물 검증을 위한 클래스입니다.

| 메서드 | 설명 |
|--------|------|
| `validate(result)` | 결과 검증 |
| `validateMany(results)` | 다중 결과 검증 |
| `addRule(rule)` | 검증 규칙 추가 |
| `removeRule(name)` | 검증 규칙 제거 |
| `getRules()` | 등록된 규칙 조회 |
| `clearRules()` | 모든 규칙 제거 |
| `requiredFields(fields)` | 필수 필드 규칙 생성 (정적) |
| `fileType(types)` | 파일 타입 규칙 생성 (정적) |
| `fileSize(maxBytes)` | 파일 크기 규칙 생성 (정적) |
| `scoreThreshold(threshold)` | 점수 임계값 규칙 생성 (정적) |
| `freshness(maxAgeMs)` | 신선도 규칙 생성 (정적) |
| `schema(schema)` | 스키마 규칙 생성 (정적) |

### AutoApprover

자동 승인을 위한 클래스입니다.

| 메서드 | 설명 |
|--------|------|
| `start()` | 자동 승인 시작 |
| `stop()` | 자동 승인 중지 |
| `registerCallback(skill, callback)` | 스킬별 콜백 등록 |
| `unregisterCallback(skill)` | 콜백 제거 |
| `validateResult(task)` | 결과 검증 |
| `approve(taskId)` | 작업 승인 |
| `reject(taskId, reason)` | 작업 거절 |

### VerificationStream

실시간 업데이트 수신을 위한 WebSocket 클라이언트입니다.

| 메서드 | 설명 |
|--------|------|
| `connect()` | WebSocket 연결 |
| `disconnect()` | 연결 해제 |
| `joinAgentRoom(agentId)` | 에이전트 룸 참여 |
| `leaveAgentRoom(agentId)` | 룸 떠나기 |
| `subscribeToVerifications(agentId)` | 검증 이벤트 구독 |
| `subscribeToEscrows(agentId)` | 에스크로 이벤트 구독 |
| `connected()` | 연결 상태 확인 |

## 타입 정의

```typescript
// 검증 상태
enum VerificationStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  MORE_INFO_REQUESTED = 'MoreInfoRequested',
}

// 에이전트 티어
enum Tier {
  UNVERIFIED = 'Unverified',
  BASIC = 'Basic',
  ADVANCED = 'Advanced',
  PREMIUM = 'Premium',
}

// 검증 결과
interface VerificationResult {
  valid: boolean;
  score?: number;
  feedback?: string;
  evidence?: string;
}
```

## 테스트

```bash
# 테스트 실행
npm test

# 커버리지 확인
npm run test:cov

# 와치 모드
npm run test:watch
```

## 라이선스

MIT

---

**@spec ADRL-0004**
