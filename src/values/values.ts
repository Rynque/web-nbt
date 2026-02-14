import { TagValueType } from '@/values/types'
import { InvalidTagValueError, TagValueDecodeError } from '@/values/errors'
import {
  padOrTrimUint8Array,
  isByte,
  isShort,
  isInt,
  isLong,
} from '@/utils/binary-utils'
import {
  encodeModifiedUtf8,
  decodeModifiedUtf8,
  calculateModifiedUtf8Length,
} from '@/utils/modified-utf8'

export abstract class TagValue<T> {
  protected _bin: Uint8Array
  protected _val?: T

  abstract readonly type: TagValueType

  constructor(bin: Uint8Array) {
    this._bin = new Uint8Array(bin) // 防御性拷贝
  }

  get bin(): Uint8Array {
    return new Uint8Array(this._bin) // 防御性拷贝
  }

  get value(): T {
    this._val ??= this._computeValue()
    return this._val
  }

  protected abstract _computeValue(): T
  protected abstract _createBin(bin: Uint8Array): this
  abstract withValue(value: T): this

  withBin(bin: Uint8Array): this {
    return this._createBin(bin)
  }

  clone(): this {
    return this._createBin(this.bin)
  }
}

export class ByteTagValue extends TagValue<number> {
  readonly type: TagValueType = TagValueType.BYTE

  static fromValue(val: number): ByteTagValue {
    if (!isByte(val))
      throw new InvalidTagValueError(
        TagValueType.BYTE,
        val,
        '字节型值应该在 -128 到 127 之间',
      )

    const buffer = new ArrayBuffer(1)
    const view = new DataView(buffer)
    view.setInt8(0, val)
    return new ByteTagValue(new Uint8Array(buffer))
  }

  constructor(bin: Uint8Array) {
    bin = padOrTrimUint8Array(bin, 1)
    super(bin)
  }

  protected _computeValue(): number {
    const view = new DataView(this._bin.buffer, this._bin.byteOffset, 1)
    return view.getInt8(0)
  }

  protected _createBin(bin: Uint8Array): this {
    return new ByteTagValue(bin) as this
  }

  withValue(val: number): this {
    return ByteTagValue.fromValue(val) as this
  }
}

export class ShortTagValue extends TagValue<number> {
  readonly type: TagValueType = TagValueType.SHORT

  static fromValue(val: number): ShortTagValue {
    if (!isShort(val))
      throw new InvalidTagValueError(
        TagValueType.SHORT,
        val,
        '短整型值应该在 -32768 到 32767 之间',
      )

    const buffer = new ArrayBuffer(2)
    const view = new DataView(buffer)
    view.setInt16(0, val)
    return new ShortTagValue(new Uint8Array(buffer))
  }

  constructor(bin: Uint8Array) {
    bin = padOrTrimUint8Array(bin, 2)
    super(bin)
  }

  protected _computeValue(): number {
    const view = new DataView(this._bin.buffer, this._bin.byteOffset, 2)
    return view.getInt16(0)
  }

  protected _createBin(bin: Uint8Array): this {
    return new ShortTagValue(bin) as this
  }

  withValue(val: number): this {
    return ShortTagValue.fromValue(val) as this
  }
}

export class IntTagValue extends TagValue<number> {
  readonly type: TagValueType = TagValueType.INT

  static fromValue(val: number): IntTagValue {
    if (!isInt(val))
      throw new InvalidTagValueError(
        TagValueType.INT,
        val,
        '整型值应该在 -2147483648 到 2147483647 之间',
      )

    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setInt32(0, val)
    return new IntTagValue(new Uint8Array(buffer))
  }

  constructor(bin: Uint8Array) {
    bin = padOrTrimUint8Array(bin, 4)
    super(bin)
  }

  protected _computeValue(): number {
    const view = new DataView(this._bin.buffer, this._bin.byteOffset, 4)
    return view.getInt32(0)
  }

  protected _createBin(bin: Uint8Array): this {
    return new IntTagValue(bin) as this
  }

  withValue(val: number): this {
    return IntTagValue.fromValue(val) as this
  }
}

export class LongTagValue extends TagValue<bigint> {
  readonly type: TagValueType = TagValueType.LONG

  static fromValue(val: bigint): LongTagValue {
    if (!isLong(val))
      throw new InvalidTagValueError(
        TagValueType.LONG,
        val,
        '长整型值应该在 -9223372036854775808n 到 9223372036854775807n 之间',
      )

    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setBigInt64(0, val)
    return new LongTagValue(new Uint8Array(buffer))
  }

  constructor(bin: Uint8Array) {
    bin = padOrTrimUint8Array(bin, 8)
    super(bin)
  }

  protected _computeValue(): bigint {
    const view = new DataView(this._bin.buffer, this._bin.byteOffset, 8)
    return view.getBigInt64(0)
  }

  protected _createBin(bin: Uint8Array): this {
    return new LongTagValue(bin) as this
  }

  withValue(val: bigint): this {
    return LongTagValue.fromValue(val) as this
  }
}

export class StringTagValue extends TagValue<string> {
  readonly type: TagValueType = TagValueType.STRING

  static fromValue(val: string): StringTagValue {
    const length = calculateModifiedUtf8Length(val)
    if (length > 65535)
      throw new InvalidTagValueError(
        TagValueType.STRING,
        val,
        `字符串长度不能超过 65535，实际长度为 ${length}`,
      )

    const encoded = encodeModifiedUtf8(val)
    const bin = new Uint8Array(2 + length)

    bin[0] = (length >> 8) & 0xff
    bin[1] = length & 0xff

    bin.set(encoded, 2)
    return new StringTagValue(bin)
  }

  constructor(bin: Uint8Array) {
    super(bin)
  }

  protected _computeValue(): string {
    if (this._bin.length < 2)
      throw new TagValueDecodeError(this.type, '字符串值二进制数据缺少长度头')

    const length = (this._bin[0]! << 8) | this._bin[1]!
    if (this._bin.length !== length + 2)
      throw new TagValueDecodeError(
        this.type,
        `字符串值二进制实际长度 ${this._bin.length} 与长度头声明 ${length} 不符`,
      )

    const encoded = this._bin.subarray(2)
    return decodeModifiedUtf8(encoded)
  }

  protected _createBin(bin: Uint8Array): this {
    return new StringTagValue(bin) as this
  }

  withValue(val: string): this {
    return StringTagValue.fromValue(val) as this
  }
}

export class FloatTagValue extends TagValue<number> {
  readonly type: TagValueType = TagValueType.FLOAT

  static fromValue(val: number): FloatTagValue {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setFloat32(0, val)
    return new FloatTagValue(new Uint8Array(buffer))
  }

  constructor(bin: Uint8Array) {
    bin = padOrTrimUint8Array(bin, 4)
    super(bin)
  }

  protected _computeValue(): number {
    const view = new DataView(this._bin.buffer, this._bin.byteOffset, 4)
    return view.getFloat32(0)
  }

  protected _createBin(bin: Uint8Array): this {
    return new FloatTagValue(bin) as this
  }

  withValue(val: number): this {
    return FloatTagValue.fromValue(val) as this
  }
}

export class DoubleTagValue extends TagValue<number> {
  readonly type: TagValueType = TagValueType.DOUBLE

  static fromValue(val: number): DoubleTagValue {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setFloat64(0, val)
    return new DoubleTagValue(new Uint8Array(buffer))
  }

  constructor(bin: Uint8Array) {
    bin = padOrTrimUint8Array(bin, 8)
    super(bin)
  }

  protected _computeValue(): number {
    const view = new DataView(this._bin.buffer, this._bin.byteOffset, 8)
    return view.getFloat64(0)
  }

  protected _createBin(bin: Uint8Array): this {
    return new DoubleTagValue(bin) as this
  }

  withValue(val: number): this {
    return DoubleTagValue.fromValue(val) as this
  }
}
