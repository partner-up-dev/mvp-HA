# View Follow-Up

- Follow-up slice: move admin system-message send flow out of the Anchor PR maintenance page into a dedicated Admin Console view.
- Reason: the messaging flow is now a first-class operator task, and keeping it inside the already-large Anchor PR maintenance page weakens navigation clarity.
- Invariants:
  - backend contract remains `POST /api/admin/anchor-prs/:id/messages`
  - Anchor PR maintenance behavior remains unchanged aside from removing the inline system-message composer
  - Admin Console still reuses the same anchor workspace payload for event / batch / PR selection
