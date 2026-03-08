# Core Sync Manifest

> Generated: 2026-03-08 22:59:59 KST

## Changed Files
- docs/todo/CURRENT.md
- docs/todo/MARKETPLACE_FRONTEND_EXECUTION_PLAN.md
- docs/todo/MARKET_WEB_V1_LAUNCH_PLAN.md
- docs/todo/ROADMAP.md
- packages/backend/src/modules/admin/admin.controller.spec.ts
- packages/backend/src/modules/admin/admin.module.ts
- packages/backend/src/modules/admin/admin.service.spec.ts
- packages/backend/src/modules/admin/admin.service.ts
- packages/backend/src/modules/agents/agents.service.ts
- packages/backend/src/modules/agents/dto/agent-filter.dto.ts
- packages/backend/src/modules/bids/bids.controller.spec.ts
- packages/backend/src/modules/bids/bids.controller.ts
- packages/backend/src/modules/disputes/disputes.controller.spec.ts
- packages/backend/src/modules/disputes/disputes.controller.ts
- packages/backend/src/modules/disputes/disputes.module.ts
- packages/backend/src/modules/disputes/disputes.service.spec.ts
- packages/backend/src/modules/disputes/disputes.service.ts
- packages/backend/src/modules/disputes/dto/dispute-filter.dto.ts
- packages/backend/src/modules/ledger/dto/ledger-filter.dto.ts
- packages/backend/src/modules/ledger/ledger.controller.ts
- packages/backend/src/modules/ledger/ledger.module.ts
- packages/backend/src/modules/ledger/ledger.service.spec.ts
- packages/backend/src/modules/ledger/ledger.service.ts
- packages/backend/src/modules/notifications/notification-delivery.service.spec.ts
- packages/backend/src/modules/notifications/notification-delivery.service.ts
- packages/backend/src/modules/notifications/notifications.service.spec.ts
- packages/backend/src/modules/notifications/notifications.service.ts
- packages/backend/src/modules/payments/dto/payment-filter.dto.ts
- packages/backend/src/modules/payments/payments.module.ts
- packages/backend/src/modules/payments/payments.service.spec.ts
- packages/backend/src/modules/payments/payments.service.ts

## API Endpoints Touched
- packages/backend/src/modules/admin/admin.controller.ts
  - base: /admin
  -   @Get('dashboard')
  -   @Get('activity')
- packages/backend/src/modules/bids/bids.controller.ts
  - base: /bids
  -   @Post()
  -   @Get()
  -   @Get(':id')
  -   @Get('task/:taskId')
  -   @Patch(':id')
  -   @Patch(':id/accept')
  -   @Patch(':id/reject')
  -   @Patch(':id/withdraw')
- packages/backend/src/modules/disputes/disputes.controller.ts
  - base: /disputes
  -   @Post()
  -   @Get()
  -   @Get('statistics')
  -   @Get(':id')
  -   @Patch(':id/resolve')
  -   @Patch(':id/escalate')
- packages/backend/src/modules/ledger/ledger.controller.ts
  - base: /ledger
  -   @Post('entries')
  -   @Get('entries')
  -   @Post('process-batch')
  -   @Get('summary')

## Docs/SDK Sync Checklist
- [ ] zkest-agent-docs API reference update
- [ ] zkest-agent-docs examples update
- [ ] zkest-agent-sdk TS client endpoints sync
- [ ] zkest-agent-sdk Python client endpoints sync
- [ ] changelog/release note update
