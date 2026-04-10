# Cross-Domain Interactions

## 1. PartnerRequest Core x Identity And Session

- `Community PR` publish, join, and exit depend on local account plus PIN.
- Key `Anchor PR` actions depend on authenticated session plus WeChat binding.
- Identity is not an independent endpoint. It exists to support the collaboration path.

## 2. PartnerRequest Core x Participation And Reliability

- Whether a PR can still be joined, whether it has formed, whether it is full, and whether confirmation is required all depend on participation and reliability rules.
- Participant-slot state feeds back into current count, availability, and downstream action semantics.

## 3. Event And Anchor Context x PartnerRequest Core

- Anchor Event and batch provide context and entry for `Anchor PR`.
- `Anchor PR` is not a standalone object divorced from event context. It is a collaboration instance inside that context.

## 4. Distribution And Attribution x PartnerRequest Core

- Sharing turns a PR into a distributable object.
- `spm` attribution carries source context back into downstream behavior.
- Re-entry is a necessary part of the distribution loop.

## 5. Participation And Reliability x Distribution And Attribution

- Sharing may drive participation, but the reliability loop is what turns successful distribution into real collaboration.
- Notifications, confirmation, and check-in convert "someone came in" into "the collaboration actually happened".

## 6. Support And Operations x All Other Boundaries

- Support, author feedback, beta-group access, configuration, and operator capability can all affect whether the user can complete the collaboration path.
- These are not always the primary user path, but they matter materially during cold start and service continuity.
