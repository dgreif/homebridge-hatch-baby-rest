# homebridge-hatch-baby-rest

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

This homebridge plugin allows you to add the Hatch Rest, Rest+ and Rest Mini, and Restore to HomeKit. For each device, you are able to control the following:

- On / Off - Master switch for both light and sound \*\*
- Brightness and Color \*\*
- Audio Track - represented as a Fan, with different speed levels mapping to different audio tracks. For example, 0% is the "None" track, and 100% is the "Rock-a-Bye" track
- Volume - not available in the Home app, but in some 3rd party HomeKit apps
- Battery level and firmware version (Rest+ only)

\*\* Rest Mini does not have a light, so only audio controls are available

The Hatch Restore, Restore 2, Rest 2nd Gen and Rest+ 2nd Gen support much more complicated routines which do not map well to HomeKit controls. Because of this complexity, they are exposed as a simple switch. Turning the switch on will initiate the first step in your Bedtime routine. Turning the switch off will turn the device off no matter which routine/step you are in.

If you have an older bluetooth model, please see the [`homebridge-hatch-rest-bluetooth` plugin](../homebridge-hatch-rest-bluetooth)

## Easy Setup

For the best experience, install and set up this plugin using [`homebridge-config-ui-x`](https://www.npmjs.com/package/homebridge-config-ui-x).
This provides a user interface in which you can enter your account information without modifying your config file manually.

## Manual Installation

`npm i -g homebridge-hatch-baby-rest`

### Configuration

The Hatch sounds machines use WiFi to directly interact with Hatch's api. This allows you to access all of your Rest/Restore devices by simply providing your Hatch Baby email/password.

```json
{
  "platforms": [
    {
      "platform": "HatchBabyRest",
      "email": "someone@gmail.com",
      "password": "secret password"
    }
  ]
}
```

### Logging

You can suppress some logging such as on/off events by adding `"reduceLogging": true` to your config and restarting homebridge.

### Device Discovery

If you have a new device which is not yet supported, you will see a message like `Unsupported Product Found: restoreV4`. In this case, add `"debug": true` to your config and restart homebridge. This will log the device information and IoT state to the console. Please open an issue with this information and we will see if we can add support for your device.
