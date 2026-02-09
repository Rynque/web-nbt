export function padOrTrimUint8Array(
  bin: Uint8Array,
  length: number,
  littleEndian: boolean = false,
): Uint8Array {
  if (bin.length === length) return bin

  const result = new Uint8Array(length)
  // 修剪
  if (bin.length > length) {
    if (littleEndian) {
      result.set(bin.subarray(0, length))
    } else {
      result.set(bin.subarray(bin.length - length))
    }
    // 填充
  } else {
    if (littleEndian) {
      result.set(bin)
    } else {
      result.set(bin, length - bin.length)
    }
  }
  return result
}

export function isValidByte(value: number, unsigned = false): boolean {
  if (unsigned) return 0 <= value && value <= 255
  return Number.isInteger(value) && -128 <= value && value <= 127
}
export function isValidShort(value: number, unsigned = false): boolean {
  if (unsigned) return 0 <= value && value <= 65535
  return Number.isInteger(value) && -32768 <= value && value <= 32767
}
export function isValidInt(value: number, unsigned = false): boolean {
  if (unsigned) return 0 <= value && value <= 4294967295
  return Number.isInteger(value) && -2147483648 <= value && value <= 2147483647
}
export function isValidLong(value: bigint, unsigned = false): boolean {
  if (unsigned) return 0 <= value && value <= 18446744073709551615n
  return -9223372036854775808n <= value && value <= 9223372036854775807n
}
