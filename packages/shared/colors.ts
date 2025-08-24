import type { RgbColor } from './hatch-sleep-types.ts'

import rgb2hsv from 'pure-color/convert/rgb2hsv'
import hsv2rgb from 'pure-color/convert/hsv2rgb'
const HEX_MAX = 255

// 0-maxValue in, 0-255 out
export function convertToHexRange(value: number, maxValue: number) {
  return Math.floor((value / maxValue) * HEX_MAX)
}

export function convertFromHexRange(value: number, maxValue: number) {
  return Math.floor((value * maxValue) / HEX_MAX)
}

// r,g,b
export function rgbToHsb({ r, g, b }: RgbColor, maxValue = HEX_MAX) {
  const [h, s, v] = rgb2hsv([
    convertToHexRange(r, maxValue),
    convertToHexRange(g, maxValue),
    convertToHexRange(b, maxValue),
  ])
  return { h, s, b: v } as { h: number; s: number; b: number }
}

export interface HsbColor {
  h: number // 0-360
  s: number // 0-100
  b: number // 0-100
}

export function hsbToRgb(hsb: HsbColor, maxValue = HEX_MAX): RgbColor {
  const [r, g, b] = hsv2rgb([hsb.h, hsb.s, hsb.b]).map((value: number) =>
    convertFromHexRange(value, maxValue),
  )
  return { r, g, b }
}
