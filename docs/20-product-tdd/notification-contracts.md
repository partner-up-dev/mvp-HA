# Notification Contracts

## Role In The System

Notification is the backend-owned reliability boundary for user attention opportunities.

It coordinates:

- notification opportunity lifecycle
- notification wave lifecycle
- user subscription quota consumption
- asynchronous eligibility revalidation
- channel dispatch results
- delivery-attempt observability

Transport integrations live behind channel adapters. Current production channels are WeChat subscription messages and WeChat template fallback for confirmation reminders. Future email and SMS channels should enter through the same adapter shape.

## Durable Backend State

Backend owns these notification records:

- `user_notification_opts`: user-level WeChat subscription quota and opt state
- `notification_opportunities`: one send opportunity per recipient, kind, aggregate, channel, run time, and dedupe key
- `notification_waves`: wave lifecycle state, currently used for PR message unread waves
- `notification_deliveries`: send-attempt outcomes for success, skipped, and failed delivery
- `jobs`: durable delayed execution with dedupe, lease, retry, and tolerance policy

`notification_opportunities` records intent. `notification_deliveries` records actual attempt outcome.

## Lifecycle Models

One-shot notifications represent a single opportunity created from a business condition:

- `REMINDER_CONFIRMATION`
- `ACTIVITY_START_REMINDER`
- `BOOKING_RESULT`
- `NEW_PARTNER`

Wave notifications represent a bounded attention window:

- `PR_MESSAGE`

The current `PR_MESSAGE` policy opens one unread wave per `PR / recipient` and creates one delayed summary opportunity for that wave.

## Creation Contract

Business domains emit business events such as:

- `pr.message_created`
- `partner.joined`
- booking execution submission through the admin booking execution flow

`domains/notification` evaluates those facts or the scheduling input, creates `notification_opportunities` / `notification_waves`, and emits notification-owned events:

- `notification.wave_opened`
- `notification.opportunity_created`

This keeps PR, Booking Support, and future domains coupled to business events and read models, while notification owns attention policy.

## Dispatch Contract

At dispatch time, backend reloads current state and revalidates:

- recipient user exists and is active
- recipient has a usable channel identity such as `openid`
- recipient still has enabled subscription quota for the notification kind
- PR participant membership is still active when the notification depends on PR membership
- PR message unread wave is still pending when dispatching `PR_MESSAGE`
- the target channel is configured

Channel adapters return a neutral dispatch result:

- `SENT`
- `FAILED` with reason `CHANNEL_NOT_CONFIGURED`
- `FAILED` with reason `RECIPIENT_PERMISSION_REVOKED`
- `FAILED` with reason `TRANSPORT_ERROR`

The WeChat `43101` refusal signal maps to `RECIPIENT_PERMISSION_REVOKED`. That result clears remaining credits and cancels pending jobs for the affected user/kind where the current policy requires cleanup.

## PR Message Unread Wave Contract

`PR_MESSAGE` notification eligibility is at most one send per `PR / recipient / unread wave`.

The unread-wave opening rule is:

- collect current active participants except the author
- skip recipients without enabled `PR_MESSAGE` quota
- skip recipients with an existing pending unread wave
- persist `lastNotifiedMessageId`
- create a `notification_waves` row
- create a delayed `notification_opportunities` row
- schedule one DB-backed delayed job

The delayed job recomputes latest unread sender, latest unread timestamp, and unread count from persisted messages at execution time.

Read-marker advancement stays explicit through the message read-marker API. Hidden fetches and prefetches cannot clear unread-wave state.

## Frontend Contract

Frontend owns:

- route/page placement
- subscription modal presentation
- thread rendering
- composer input
- cache refresh
- user-facing fallback copy

Backend owns:

- notification eligibility
- quota consumption
- channel configuration truth
- unread-wave reset rules
- delivery result persistence

Frontend renders notification subscription management and prompts users after successful Anchor PR join, then relies on backend responses and durable state for delivery-adjacent truth.

