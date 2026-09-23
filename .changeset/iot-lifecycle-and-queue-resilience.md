---
'homebridge-hatch-baby-rest': patch
---

Survive extended network outages in the AWS IoT client lifecycle and fix the residual failure modes that remained on top of it:

- Extract the MQTT client lifecycle (creation, retry, dead-connection recovery, credential rotation) into a standalone, unit-tested `IotClientLifecycle` state machine instead of a tangle of closures.
- Create replacement MQTT clients before ending the previous one, and retry failed client creation with backoff forever - including the very first client at startup, so a boot-time outage is never fatal.
- Recreate the client with fresh credentials when the SDK's built-in reconnect cannot recover within a dead-connection window, and rotate credentials on an interval that survives failed refreshes.
- Attach the MQTT connect listener synchronously so the connect event is never missed, and re-fetch the device shadow after SDK-internal reconnects.
- Stop a client that never connects (e.g. replaced mid-outage) from permanently wedging the command queue; queued commands now wait for whichever client is actually registered.
- Retry a failed launch-time API connection with backoff instead of leaving cached accessories dead in HomeKit until a restart.
- Guard `turnOnRoutine` against an empty routines list and an unhandled rejection that could crash the process.
