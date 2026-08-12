---
"homebridge-hatch-baby-rest": patch
---

Survive extended network outages in the AWS IoT client lifecycle: create replacement MQTT clients before ending the previous one, retry failed client creation with backoff forever, recreate the client with fresh credentials when the SDK's built-in reconnect cannot recover, refresh credentials on an interval that survives failed refreshes, re-fetch the device shadow after SDK-internal reconnects, and attach the MQTT connect listener synchronously so the connect event is never missed.
