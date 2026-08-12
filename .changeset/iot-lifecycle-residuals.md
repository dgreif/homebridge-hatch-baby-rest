---
'homebridge-hatch-baby-rest': patch
---

Fix three failure modes that could leave the plugin silently broken until a homebridge restart: a client that never connects no longer wedges the command queue (commands queued during the gap are delivered once a replacement client registers), a failed API connection at launch is retried with backoff instead of being fatal, and turning on a routine no longer risks an unhandled rejection (or a crash when the account has no touch ring routines)
