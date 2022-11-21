# homebridge-hatch-rest-bluetooth

This plugin is specifically designed for the original Bluetooth Rest sound machine. If you have a newer WiFi model, please see the [`homebridge-hatch-baby-rest` plugin](../homebridge-hatch-baby-rest)

I no longer personally use the Bluetooth Rest as the WiFi models have more features and are more reliable. As such, this plugin is strictly in maintenance mode. PRs welcome from anyone willing to make improvements.

## Installation Prerequisites

Before installing, ensure your environment is configured to install the Bluetooth binaries used by this plugin. See [the @abandonware/noble docs](https://github.com/abandonware/noble#prerequisites) for more platform-specific steps.

The original Rest night light uses Bluetooth to control the light and change settings. Because of this restriction, you must specify the name and mac address for each light that you would like to add to HomeKit. Please note that this plugin will only be able to connect to the Rest night light if run on a device with Bluetooth LE (version 4+). This includes the Raspberry Pi 3 b+ and newer, as well as most modern laptops. Please check your device specifications to ensure it supports Bluetooth LE before trying to run the plugin or opening GitHub issues.

## Easy Setup

For the best experience, install and set up this plugin using [`homebridge-config-ui-x`](https://www.npmjs.com/package/homebridge-config-ui-x).
This provides a user interface in which you can enter your account and light information without modifying your config file manually.

## Manual Installation

`npm i -g homebridge-hatch-baby-rest`

## Configuration

To add a Rest night light to your homebridge setup, first open the Hatch app on your smartphone or tablet. In the device settings for your light, find the MAC address. In the example below, it is `12:34:56:78:90:AB`.

```json
{
  "platforms": [
    {
      "platform": "HatchBabyRest",
      "restLights": [
        {
          "name": "Kid's Night Light",
          "macAddress": "12:34:56:78:90:AB"
        }
      ]
    }
  ]
}
```

### Bluetooth on Linux (Raspberry Pi)

If the plugin is unable to connect to your bluetooth Rest and you are running homebridge on a Raspberry Pi
or similar verion of linux, try running the following commands and then restarting homebridge

```
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```
