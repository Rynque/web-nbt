export function encodeModifiedUtf8(str: string): Uint8Array {
  const bytes: number[] = []

  for (const char of str) {
    const point = char.codePointAt(0)

    if (point === 0x0000) {
      bytes.push(0b11000000, 0b10000000)
    } else if (0x0001 <= point && point <= 0x007f) {
      bytes.push(point)
    } else if (0x0080 <= point && point <= 0x07ff) {
      bytes.push(0b11000000 | (point >>> 6), 0b10000000 | (point & 0b00111111))
    } else if (0x0800 <= point && point <= 0xffff) {
      if (
        (0xd800 <= point && point <= 0xdbff) ||
        (0xdc00 <= point && point <= 0xdfff)
      ) {
        throw new Error(
          `孤立的代理：0x${point.toString(16).toUpperCase().padStart(4, '0')}`,
        )
      }

      bytes.push(
        0b11100000 | (point >>> 12),
        0b10000000 | ((point >>> 6) & 0b00111111),
        0b10000000 | (point & 0b00111111),
      )
    } else if (0x10000 <= point && point <= 0x10ffff) {
      const offset = point - 0x10000
      const high = 0xd800 + ((offset >>> 10) & 0b1111111111)
      const low = 0xdc00 + (offset & 0b1111111111)

      // 拆分为两个代理对
      bytes.push(
        0b11100000 | (high >>> 12),
        0b10000000 | ((high >>> 6) & 0b00111111),
        0b10000000 | (high & 0b00111111),
        0b11100000 | (low >>> 12),
        0b10000000 | ((low >>> 6) & 0b00111111),
        0b10000000 | (low & 0b00111111),
      )
    } else {
      throw new Error(
        `Unicode 码点超出范围：0x${point.toString(16).toUpperCase().padStart(4, '0')}`,
      )
    }
  }

  return new Uint8Array(bytes)
}

export function decodeModifiedUtf8(bytes: Uint8Array): string {
  const points: number[] = []
  let high: number | null = null

  let i = 0
  while (i < bytes.length) {
    const byte0: number = bytes[i]
    const byte1: number | null = bytes[i + 1] ?? null
    const byte2: number | null = bytes[i + 2] ?? null

    // 1字节序列
    if ((byte0 & 0b10000000) === 0b00000000) {
      const point = byte0 & 0b01111111
      if (point === 0x00) throw new Error(`在位置 ${i} 处发现意外的码点：0x00`)

      points.push(point)
      i += 1
      // 后续字节在正常解码中不会出现
    } else if (isContinuationByte(byte0)) {
      console.warn(`在位置 ${i} 处发现并跳过了意外的后续字节`)

      i += 1
      // 2字节序列
    } else if ((byte0 & 0b11100000) === 0b11000000) {
      if (!isContinuationByte(byte1))
        throw new Error(`在位置 ${i} 处发现不完整的2字节序列`)
      const point = ((byte0 & 0b00011111) << 6) | (byte1 & 0b00111111)
      if (0x0001 <= point && point <= 0x007f)
        throw new Error(
          `在位置 ${i} 处发现无效的2字节序列：U+${point.toString(16).toUpperCase().padStart(2, '0')} 应该使用单字节编码`,
        )

      points.push(point)
      i += 2

      // 3字节序列
    } else if ((byte0 & 0b11110000) === 0b11100000) {
      if (!isContinuationByte(byte1) || !isContinuationByte(byte2)) {
        throw new Error(`在位置 ${i} 处发现不完整的3字节序列`)
      }

      let point =
        ((byte0 & 0b00001111) << 12) |
        ((byte1 & 0b00111111) << 6) |
        (byte2 & 0b00111111)

      if (point <= 0x07ff)
        throw new Error(
          `在位置 ${i} 处发现无效的3字节序列：U+${point.toString(16).toUpperCase().padStart(2, '0')} 应该使用更少的字节编码`,
        )

      // 高代理
      if (0xd800 <= point && point <= 0xdbff) {
        if (high !== null) {
          points.push(0xfffd) // 替换为替换字符
          console.warn(
            `发现并替换了孤立的高代理：U+${high.toString(16).toUpperCase().padStart(4, '0')}`,
          )
          high = null
        }
        high = point

        i += 3
        continue
        // 低代理
      } else if (0xdc00 <= point && point <= 0xdfff) {
        if (high !== null) {
          const low = point
          point =
            0x10000 |
            ((high & 0b0000001111111111) << 10) |
            (low & 0b0000001111111111)
          high = null

          points.push(point)
          i += 3
        } else {
          points.push(0xfffd) // 替换为替换字符
          console.warn(
            `发现并替换了孤立的低代理：U+${point.toString(16).toUpperCase().padStart(4, '0')}`,
          )
          i += 3
        }
      } else {
        points.push(point)
        i += 3
      }
      // 4字节序列起始
    } else if ((byte0 & 0b11111000) === 0b11110000) {
      console.warn(`在位置 ${i} 处发现并替换了意外的4字节序列`)
      points.push(0xfffd) // 替换为替换字符

      i += 1

      // 无效的序列
    } else throw new Error(`在位置 ${i} 处发现无效的序列`)

    // 插入孤立的高代理
    if (high !== null) {
      points.splice(points.length - 1, 0, 0xfffd) // 替换为替换字符
      console.warn(
        `发现并替换了孤立的高代理：U+${high.toString(16).toUpperCase().padStart(4, '0')}`,
      )
      high = null
    }
  }

  // 插入末尾的孤立高代理
  if (high !== null) {
    points.push(0xfffd) // 替换为替换字符
    console.warn(
      `在文本末尾发现并替换了孤立的高代理：U+${high.toString(16).toUpperCase().padStart(4, '0')}`,
    )
    high = null
  }

  return String.fromCodePoint(...points)
}

function isContinuationByte(byte: number | null): boolean {
  return byte !== null && (byte & 0b11000000) === 0b10000000
}

export function getModifiedUtf8Length(str: string): number {
  let length = 0

  for (const char of str) {
    const point = char.codePointAt(0)

    if (point === 0x0000) length += 2
    else if (0x0001 <= point && point <= 0x007f) length += 1
    else if (0x0080 <= point && point <= 0x07ff) length += 2
    else if (0x0800 <= point && point <= 0xffff) {
      if (
        (0xd800 <= point && point <= 0xdbff) ||
        (0xdc00 <= point && point <= 0xdfff)
      ) {
        throw new Error(
          `发现意外的代理字符：U+${point.toString(16).toUpperCase().padStart(4, '0')}`,
        )
      } else {
        length += 3
      }
    } else if (0x10000 <= point && point <= 0x10ffff) length += 6
    else {
      throw new Error(
        `Unicode 码点超出范围：0x${point.toString(16).toUpperCase().padStart(4, '0')}`,
      )
    }
  }

  return length
}
