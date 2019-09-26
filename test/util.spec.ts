import { stripMacAddress, stripUuid } from '../src/util'
import { expect } from 'chai'

describe('Utils', () => {
  describe('stripMacAddress', () => {
    it('should remove separators and to lower case', () => {
      expect(stripMacAddress('12:34:ab:CD:eF:90')).to.equal('1234abcdef90')
      expect(stripMacAddress('56-78-90-ab-CD-eF')).to.equal('567890abcdef')
    })
  })

  describe('stripUuid', () => {
    it('should remove separators and to lower case', () => {
      expect(stripUuid('02260001-5eFD-47eb-9c1a-de53f7a2b232')).to.equal(
        '022600015efd47eb9c1ade53f7a2b232'
      )
    })
  })
})
