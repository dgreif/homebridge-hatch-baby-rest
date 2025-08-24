import {
  convertFromHexRange,
  convertToHexRange,
  hsbToRgb,
  rgbToHsb,
} from '../colors'
import { describe, it, expect } from 'vitest'

describe('convertToHexRange', () => {
  it('should convert a value into the hex range', () => {
    expect(convertToHexRange(50, 100)).toBe(Math.floor((50 / 100) * 255))
  })

  it('should handle 0', () => {
    expect(convertToHexRange(0, 200)).toBe(0)
  })
})

describe('convertFromHexRange', () => {
  it('should convert a value into the hex range', () => {
    expect(convertFromHexRange(50, 100)).toBe(Math.floor((50 * 100) / 255))
  })

  it('should handle 0', () => {
    expect(convertFromHexRange(0, 200)).toBe(0)
  })
})

describe('rgbToHsb', () => {
  it('should convert rgb to hsb', () => {
    expect(
      rgbToHsb({
        r: 100,
        g: 150,
        b: 200,
      }),
    ).to.eql({
      h: 210,
      s: 50,
      b: 78.4313725490196,
    })
  })

  it('should map to a different range if provided a max value', () => {
    const maxValue = 255 * 6
    expect(
      rgbToHsb(
        {
          r: (50 * maxValue) / 255,
          g: (100 * maxValue) / 255,
          b: (50 * maxValue) / 255,
        },
        maxValue,
      ),
    ).toEqual({
      h: 120,
      s: 50,
      b: 39.2156862745098,
    })
  })
})

describe('hsbToRgb', () => {
  it('should convert rgb to hsb', () => {
    expect(
      hsbToRgb({
        h: 210,
        s: 50,
        b: 78.4313725490196,
      }),
    ).toEqual({
      r: 100 - 1,
      g: 150 - 1,
      b: 200 - 1,
    })
  })

  it('should map to a different range if provided a max value', () => {
    const maxValue = 255 * 3
    expect(
      hsbToRgb(
        {
          h: 120,
          s: 50,
          b: 39.2156862745098,
        },
        maxValue,
      ),
    ).toEqual({
      r: (50 * maxValue) / 255 - 1,
      g: (100 * maxValue) / 255 - 1,
      b: (50 * maxValue) / 255 - 1,
    })
  })
})
