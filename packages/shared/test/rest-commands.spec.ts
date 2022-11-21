import { formatRestCommand, RestCommand } from '../rest-commands'
import { expect } from 'chai'
import { AudioTrack } from '../hatch-sleep-types'

describe('Feedback Parsing', () => {
  it('should format a number command into a buffer', () => {
    expect(formatRestCommand(RestCommand.SetPower, 1)).to.eql(
      Buffer.from('SI01')
    )
    expect(formatRestCommand(RestCommand.SetVolume, 254)).to.eql(
      Buffer.from('SVFE')
    )
    expect(
      formatRestCommand(RestCommand.SetTrackNumber, AudioTrack.Crickets)
    ).to.eql(Buffer.from('SN0A'))
  })

  it('should format a color command into a buffer', () => {
    expect(
      formatRestCommand(RestCommand.SetColor, {
        r: 1,
        g: 2,
        b: 3,
        a: 200,
      })
    ).to.eql(Buffer.from('SC010203C8'))

    expect(
      formatRestCommand(RestCommand.SetColor, {
        r: 255,
        g: 255,
        b: 255,
        a: 83,
      })
    ).to.eql(Buffer.from('SCFFFFFF53'))
  })
})
