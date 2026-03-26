# Frontend Interfaces

## Inbound Interfaces

### Browser Routes

- `/`
- `/me`
- `/pr/mine`
- `/cpr/*`
- `/apr/*`
- `/events/*`
- `/contact-*`
- `/about`
- `/wechat/oauth/callback`
- `/admin/*`

### Browser/Platform APIs

- `localStorage`
- `sessionStorage`
- Web Share API
- navigation/redirect behavior in normal browsers and WeChat WebView

## Outbound Interfaces

- backend HTTP APIs through `client` and `adminClient`
- token rotation through `x-access-token`
- cookie-backed auth flows with `credentials: "include"`

## Compile-Time Interface Dependency

Frontend imports backend-exported types and `AppType` from `@partner-up-dev/backend`.

This means some frontend type breakage is intentionally detected at compile time when backend contracts move.
