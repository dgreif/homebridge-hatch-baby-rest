import { parseFeedbackBuffer } from '../feedback'
import { describe, it, expect } from 'vitest'

describe('Feedback Parsing', () => {
  it('should parse an empty feedback buffer', () => {
    expect(
      parseFeedbackBuffer(
        Buffer.from('54dfff1261430000000053000050006500000000', 'hex'),
      ),
    ).toEqual({
      time: 3758035553,
      power: false,
      volume: 0,
      color: {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
      },
      audioTrack: 0,
    })
  })

  it('should parse an active feedback buffer', () => {
    expect(
      parseFeedbackBuffer(
        Buffer.from('54dfff1d1543fefefe53530e4950016500000000', 'hex'),
      ),
    ).toEqual({
      time: 3758038293,
      power: true,
      volume: 29,
      color: {
        r: 254,
        g: 254,
        b: 254,
        a: 83,
      },
      audioTrack: 14,
    })
  })

  it('should handle different power presets', () => {
    expect(
      parseFeedbackBuffer(
        Buffer.from('54dfff1d1543fefefe53530e4950DF6500000000', 'hex'),
      ).power,
    ).toBe(false)

    expect(
      parseFeedbackBuffer(
        Buffer.from('54dfff1d1543fefefe53530e4950006500000000', 'hex'),
      ).power,
    ).toBe(false)

    expect(
      parseFeedbackBuffer(
        Buffer.from('54dfff1d1543fefefe53530e49501F6500000000', 'hex'),
      ).power,
    ).toBe(true)

    expect(
      parseFeedbackBuffer(
        Buffer.from('54dfff1d1543fefefe53530e49501F6500000000', 'hex'),
      ).power,
    ).toBe(true)
  })
})
