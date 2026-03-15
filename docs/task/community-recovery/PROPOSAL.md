The Community recovery idea is directionally right, but PIN alone is the wrong credential boundary.

Today local auth recovery uses userId + userPin via auth.controller.ts and the frontend store persists both in useUserSessionStore.ts. A 4-digit PIN by itself is too weak and too ambiguous to become a global login key. That would lower safety and create ugly edge cases.

My recommendation:

Keep the subtle secondary tip under Community Join.
Change the copy to something like Already joined before? Restore access.
Do not implement PIN-only recovery.
Implement recovery as userId + PIN, or introduce a stronger dedicated recovery credential if you want cross-device restore to feel simpler.
Also show the user’s recovery identity clearly after Community join/publish, not just the PIN.
That gives you the UX benefit without weakening the auth model.
