import { kebabCaseAddress, stripUuid } from '../src/util'
import { expect } from 'chai'

describe('Utils', () => {
  describe('kebabCaseAddress', () => {
    it('should remove non-hex characters and switch to kebab separators', () => {
      expect(kebabCaseAddress('ab:cd:ef:12:34:56')).to.equal(
        'ab-cd-ef-12-34-56'
      )
      expect(kebabCaseAddress('AB CD EF 78 90 12')).to.equal(
        'ab-cd-ef-78-90-12'
      )
      expect(kebabCaseAddress('__ABCDEF901234!@^k;j/')).to.equal(
        'ab-cd-ef-90-12-34'
      )
    })

    it('should throw if the address is not the correct length', () => {
      expect(() => kebabCaseAddress('123456789')).to.throw(
        'Invalid mac address 123456789'
      )
      expect(() => kebabCaseAddress('1234567890')).to.throw(
        'Invalid mac address 1234567890'
      )
      expect(() => kebabCaseAddress('12345678901')).to.throw(
        'Invalid mac address 12345678901'
      )
      expect(() => kebabCaseAddress('123456789012')).to.not.throw()
      expect(() => kebabCaseAddress('1234567890123')).to.throw(
        'Invalid mac address 1234567890123'
      )
    })
  })

  describe('stripUuid', () => {
    it('should remove separators', () => {
      expect(stripUuid('02260001-5efd-47eb-9c1a-de53f7a2b232')).to.equal(
        '022600015efd47eb9c1ade53f7a2b232'
      )
    })
  })
})
