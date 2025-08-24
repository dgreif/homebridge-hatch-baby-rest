import { stripMacAddress, stripUuid } from '../util'
import { describe, it, expect } from 'vitest'

describe('Utils', () => {
  describe('stripMacAddress', () => {
    it('should remove separators and to lower case', () => {
      expect(stripMacAddress('12:34:ab:CD:eF:90')).toBe('1234abcdef90')
      expect(stripMacAddress('56-78-90-ab-CD-eF')).toBe('567890abcdef')
    })
  })

  describe('stripUuid', () => {
    it('should remove separators and to lower case', () => {
      expect(stripUuid('02260001-5eFD-47eb-9c1a-de53f7a2b232')).toBe(
        '022600015efd47eb9c1ade53f7a2b232',
      )
    })
  })
})
