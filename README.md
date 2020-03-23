# homebridge-hatch-baby-rest

[![Actions Status](https://github.com/dgreif/homebridge-hatch-baby-rest/workflows/Node%20CI/badge.svg)](https://github.com/dgreif/homebridge-hatch-baby-rest/actions)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=HD9ZPB34FY428&currency_code=USD&source=url)

This homebridge plugin allows you to add the Hatch Baby Rest and the Hatch Baby Rest+ night lights to HomeKit.

## Installation

`npm i -g homebridge-hatch-baby-rest`

## Configuration For Hatch Baby Rest+ (wifi night light)

The Rest+ night light uses wifi to directly interact with Hatch Baby's api.  This allows you to access all of your Rest+ lights by simply providing your Hatch Baby email/password.

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

With this configuration in place, you should now be able to control all of your Rest+ lights from HomeKit.  Controls include on/off, brightness, volume (not available in the Home app, but in some 3rd party HomeKit apps).  You can also view the current battery level and firmware version of your lights.

## Configuration For Hatch Baby Rest (bluetooth night light)

The original Rest night light uses Bluetooth to control the light and change settings.  Because of this restriction, you must create an `accessories` entry for each light that you would like to add to HomeKit.  Please note that this plugin will only be able to connect to the Rest night light if run on a device with Bluetooth LE (version 4+).  This includes the Raspberry Pi 3 b+ and newer, as well as most modern laptops.  Please check your device specifications to ensure it supports Bluetooth LE before trying to run the plugin or opening GitHub issues.

To add a Rest night light to your homebridge setup, first open the Hatch Baby Rest app on your smartphone or tablet.  In the device settings for your light, find the MAC address.  In the example below, it is `12:34:56:78:90:AB`.

 ```json
{
  "accessories": [
    {
      "accessory": "HatchBabyRest",
      "service": "light",
      "name": "Kid's Night Light",
      "macAddress": "12:34:56:78:90:AB",
      "volume": 29,
      "audioTrack": 14,
      "color": { "r": 254, "g": 254, "b": 254, "a": 83 }
    }
  ]
}
```

### Rest Accessory Configuration Options

The original Rest night light does not retain color/volume/audio track settings when turned off and back on.  Because of this, you will need to specify your desired settings in the configuration so that the light turns on with the correct settings

Option | Required | Details
--- | --- | ---
accessory | `true` | _Must_ be `HatchBabyRest` to link it to this plugin
service | `false` | Defines what type of service the Rest accessory uses.  Possible values are: `"switch"` for `Switch` and `"light"` for `LightBulb` (default)
name | `true` | The name you want assigned to this light in HomeKit
macAddress | `true` | The MAC address for the light, found in your Hatch Baby Rest app.  This is used to discover the light via bluetooth
volume | `false` | The volume level to set the speaker of the light to when it is turned on.  Must be between 0 and 100.  If set to 0 or left blank, the speaker will not play music when turned on via HomeKit
audioTrack | `false` | The audio track number to play when the light is turned on with HomeKit.  See the table below for the different track names/numbers
color | `false` | The color and intensity to turn on the light. See below for more details

Please note, the light will do _nothing_ if you don't supply either `color` or `volume` and `audioTrack`.

### Audio Configuration

To play music when the light is turned on via HomeKit, you _must_ supply _both_ `volume` and `audioTrack`.  These are the audio tracks an their associated number which you can use in the configuration:

Track Name | Track Number
--- | ---
None | 0
Stream | 2
PinkNoise | 3
Dryer | 4
Ocean | 5
Wind | 6
Rain | 7
Bird | 9
Crickets | 10
Brahms | 11
Twinkle | 13
RockABye | 14

### Color Configuration

`color` must be in the format `{ "r": 254, "g": 254, "b": 254, "a": 83 }`.  `r` (red), `g` (green) and `b` (blue) can be combined to create different colors.  If you supply `254` for `r`, `g` and `b`, the light will go into multi-color mode and rotate through all of the colors.  `a` determines how bright the light should be (values from `0` - `255`).  Here are some example color configurations:

Example | Description
--- | ---
`{ "r": 254, "g": 254, "b": 254, "a": 64 }` | multi-color, 1/4 brightness
`{ "r": 255, "g": 255, "b": 255, "a": 255 }` | white, full brightness
`{ "r": 255, "g": 0, "b": 0, "a": 128 }` | red, 1/2 brightness
`{ "r": 0, "g": 255, "b": 0, "a": 128 }` | green, 1/2 brightness
`{ "r": 0, "g": 0, "b": 255, "a": 128 }` | blue, 1/2 brightness
`{ "r": 255, "g": 0, "b": 255, "a": 128 }` | purple, 1/2 brightness
