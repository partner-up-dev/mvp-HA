# Scope

## In Scope

- two collaboration object types: `Community PR` and `Anchor PR`
- home exploration, event browsing, `Community PR` creation, and PR detail participation
- local account plus PIN, WeChat login / binding, `/me`, and `/pr/mine`
- distribution paths, WeChat share, Xiaohongshu caption / poster output, and `spm` attribution
- `Anchor PR` detail-page information architecture: persistent notification subscriptions section, facts-card driven participant roster modal, clickable participant profile badges, and venue-image entry through a clickable label row
- non-realtime PR messaging and message notifications, including participant-authored messages plus operator-authored system messages, with the current frontend `Anchor PR` rollout exposed through the dedicated `/apr/:id/messages` route family
- `Anchor PR` reliability loop: confirmation, reminders, check-in, and new-partner notifications
- `Anchor PR` booking fulfillment result notifications and operator execution audit
- support routing through "Need Help", author feedback, and about-page entry
- operator maintenance of Anchor Event, Batch, Anchor PR, POI, and Booking Support semantics

## Explicitly Out Of Scope

- turning the product into an independent community, content platform, or social network
- a generic `Anchor PR` creation entrypoint detached from Anchor Event and batch context
- direct publish inside Xiaohongshu
- multilingual product experience

## Deliberately Retained Current-Stage Constraints

- some real product capabilities still depend on WeChat environment differences and operator-managed configuration
