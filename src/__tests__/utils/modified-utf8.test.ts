import { describe, it, expect, vi } from 'vitest'
import { encodeModifiedUtf8, decodeModifiedUtf8 } from '@/utils/modified-utf8'

describe('修改版 utf8 编解码', () => {
  describe('编码修改版 utf8 字符串', () => {
    it('应该正确编码空字符串', () => {
      const result = encodeModifiedUtf8('')
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(0)
    })

    it('应该正确编码 0x00', () => {
      const result = encodeModifiedUtf8(String.fromCodePoint(0x00))
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(2)
      expect(result).toEqual(new Uint8Array([0xc0, 0x80]))
    })

    it('应该正确编码单字节字符', () => {
      const char = 'a'
      const result = encodeModifiedUtf8(char)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(1)
      expect(result).toEqual(new Uint8Array([0x61]))
    })

    it('应该正确编码2字节字符', () => {
      const char = '§'
      const result = encodeModifiedUtf8(char)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(2)
      expect(result).toEqual(new Uint8Array([0xc2, 0xa7]))
    })

    it('应该正确编码3字节字符', () => {
      const char = '一'
      const result = encodeModifiedUtf8(char)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(3)
      expect(result).toEqual(new Uint8Array([0xe4, 0xb8, 0x80]))
    })

    it('应该正确编码辅助平面字符', () => {
      const char = '\u{1F600}'
      const result = encodeModifiedUtf8(char)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(6)
      expect(result).toEqual(
        new Uint8Array([0xed, 0xa0, 0xbd, 0xed, 0xb8, 0x80]),
      )
    })

    it('应该对孤立的高代理抛出错误', () => {
      expect(() => encodeModifiedUtf8('\uD800')).toThrow()
      expect(() => encodeModifiedUtf8('\uDBFF')).toThrow()
    })

    it('应该对孤立的低代理抛出错误', () => {
      expect(() => encodeModifiedUtf8('\uDC00')).toThrow()
      expect(() => encodeModifiedUtf8('\uDFFF')).toThrow()
    })
  })

  describe('解码修改版 utf8 字符串', () => {
    it('应该正确解码空字符串', () => {
      const result = decodeModifiedUtf8(new Uint8Array([]))
      expect(result.length).toBe(0)
      expect(result).toBe('')
    })

    it('应该正确解码 0x00', () => {
      const result = decodeModifiedUtf8(new Uint8Array([0xc0, 0x80]))
      expect(result.length).toBe(1)
      expect(result.codePointAt(0)).toBe(0x00)
    })

    it('应该正确解码单字节字符', () => {
      const result = decodeModifiedUtf8(new Uint8Array([0x61]))
      expect(result.length).toBe(1)
      expect(result).toBe('a')
    })

    it('应该正确解码2字节字符', () => {
      const result = decodeModifiedUtf8(new Uint8Array([0xc2, 0xa7]))
      expect(result.length).toBe(1)
      expect(result).toBe('§')
    })

    it('应该正确解码3字节字符', () => {
      const result = decodeModifiedUtf8(new Uint8Array([0xe4, 0xb8, 0x80]))
      expect(result.length).toBe(1)
      expect(result).toBe('一')
    })

    it('应该正确解码辅助平面字符', () => {
      const result = decodeModifiedUtf8(
        new Uint8Array([0xed, 0xa0, 0xbd, 0xed, 0xb8, 0x80]),
      )
      expect([...result].length).toBe(1)
      expect(result).toBe('\u{1F600}')
    })

    it.each([
      [0xed, 0xa0, 0x80], // U+D800
      [0xed, 0xaf, 0xbf], // U+DBFF
    ])('应该对孤立的高代理输出警告', (...bytes) => {
      const warnSpy = vi.spyOn(console, 'warn')
      decodeModifiedUtf8(new Uint8Array(bytes))
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('孤立的高代理'),
      )
      warnSpy.mockRestore()
    })

    it.each([
      [0xed, 0xb0, 0x80], // U+DC00
      [0xed, 0xbf, 0xbf], // U+DFFF
    ])('应该对孤立的低代理输出警告', (...bytes) => {
      const warnSpy = vi.spyOn(console, 'warn')
      decodeModifiedUtf8(new Uint8Array(bytes))
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('孤立的低代理'),
      )
      warnSpy.mockRestore()
    })

    it('应该替换4字节字符', () => {
      expect(decodeModifiedUtf8(new Uint8Array([0xf0, 0x9f, 0x98, 0x80]))).toBe(
        '\uFFFD',
      )
    })
  })

  describe('往返测试', () => {
    it.each([
      ['空字符串', ''],
      ['ASCII字符', 'The quick brown fox jumps over the lazy dog.'],
      ['包含null字符的字符串', '\x00'],
      [
        '多语言混合字符串',
        '你好 Hello नमस्ते مرحبا こんにちは 안녕하세요 Привет Bonjour Hola Ciao สวัสดี Olá Здраво',
      ],
      ['所有基本多文种平面字符', '一 § ¶ ´ ¨'],
      ['表情符号', '😀🎉🚀'],
      ['包含控制字符', '\x07\x08\x09\x0A'],
    ])('应该正确往返编码和解码: %s', (_, str) => {
      const encoded = encodeModifiedUtf8(str)
      const decoded = decodeModifiedUtf8(encoded)
      expect(decoded).toBe(str)
    })
  })
})
