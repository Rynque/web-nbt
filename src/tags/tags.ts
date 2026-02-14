import { TagType } from '@/tags/types'
import { TagValue, StringTagValue } from '@/values/values'

export abstract class Tag<T> {
  public readonly name: StringTagValue
  public readonly id: TagType
  public readonly payload: T

  constructor(name: StringTagValue, id: TagType, payload: T) {
    this.name = name
    this.id = id
    this.payload = payload
  }

  withName(newName: StringTagValue): this {
    const Ctor = this.constructor as new (
      name: StringTagValue,
      payload: T,
    ) => this
    return new Ctor(newName, this.payload) // 子类自动填充 id
  }
  withPayload(newPayload: T): this {
    const Ctor = this.constructor as new (
      name: StringTagValue,
      payload: T,
    ) => this
    return new Ctor(this.name, newPayload) // 子类自动填充 id
  }

  protected abstract _clonePayload(): T

  clone(): this {
    const clonedName = this.name.clone()
    const clonedPayload = this._clonePayload()
    const Ctor = this.constructor as new (
      name: StringTagValue,
      payload: T,
    ) => this
    return new Ctor(clonedName, clonedPayload)
  }
}

export abstract class ScalarTag<T> extends Tag<TagValue<T>> {
  constructor(name: StringTagValue, id: TagType, payload: TagValue<T>) {
    super(name, id, payload)
  }

  protected _clonePayload(): TagValue<T> {
    return this.payload.clone()
  }
}

export abstract class SequenceTag<T> extends Tag<TagValue<T>[]> {
  constructor(name: StringTagValue, id: TagType, payload: TagValue<T>[]) {
    super(name, id, payload)
  }

  protected _clonePayload(): TagValue<T>[] {
    return this.payload.map(item => item.clone())
  }
}
