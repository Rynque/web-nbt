import { TagValueType } from '@/values/types'

export class InvalidTagValueError extends Error {
  constructor(
    public readonly tagValueType: TagValueType,
    public readonly value: unknown,
    public readonly reason?: string,
  ) {
    if (reason)
      super(`${tagValueType} 标签值 \`${String(value)}\` 无效：${reason}`)
    else super(`${tagValueType} 标签值 \`${String(value)}\` 无效`)

    this.name = 'InvalidTagValueError'
  }
}

export class TagValueDecodeError extends Error {
  constructor(
    public readonly tagValueType: TagValueType,
    public readonly reason?: string,
  ) {
    if (reason) super(`${tagValueType} 标签值二进制解码失败：${reason}`)
    else super(`${tagValueType} 标签值二进制解码失败`)

    this.name = 'TagValueDecodeError'
  }
}
