---
'homebridge-hatch-baby-rest': major
'homebridge-hatch-rest-bluetooth': major
---

Bluetooth versions of the Hatch Rest have been moved to the `homebridge-hatch-rest-bluetooth` plugin. Configuration for these lights will automatically be migrated the first time you run homebridge after updating to verison 4. You will need to manually install this new plugin for the lights to continue working, and automations related to these lights will need to be recreated. If you _only_ have bluetooth lights, you can uninstall the `homebridge-hatch-baby-rest` plugin after migrating. These bluetooth lights require complicated dependencies and are fundementally different from the WiFi based lights, so I've decided to maintain them separately moving forward.
