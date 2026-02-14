import { TagType } from '@/tags/types'
import { TagValue, StringTagValue } from '@/values/values'
import { Tag } from '@/tags/tags'

export class CompoundTag extends Tag<Map<string, Tag<unknown>>> {
  constructor(
    name: StringTagValue,
    payload: Map<string, Tag<unknown>>, // Map 作缓存键名之用，提升查找速度
  ) {
    super(name, TagType.COMPOUND, payload)
  }

  get(key: string): Tag<unknown> | undefined {
    return this.payload.get(key)
  }
  has(key: string): boolean {
    return this.payload.has(key)
  }
  size(): number {
    return this.payload.size
  }
  isEmpty(): boolean {
    return this.payload.size === 0
  }

  keys(): IterableIterator<string> {
    return this.payload.keys()
  }
  values(): IterableIterator<Tag<unknown>> {
    return this.payload.values()
  }
  entries(): IterableIterator<[string, Tag<unknown>]> {
    return this.payload.entries()
  }
  forEach(callback: (value: Tag<unknown>, key: string) => void): void {
    this.payload.forEach(callback)
  }
  [Symbol.iterator](): IterableIterator<[string, Tag<unknown>]> {
    return this.payload[Symbol.iterator]()
  }

  with(tag: Tag<unknown>): CompoundTag {
    const newMap = new Map(this.payload)
    newMap.set(tag.name.value, tag)
    return new CompoundTag(this.name, newMap)
  }
  without(key: string): CompoundTag {
    if (!this.payload.has(key)) return this
    const newMap = new Map(this.payload)
    newMap.delete(key)
    return new CompoundTag(this.name, newMap)
  }

  merge(other: CompoundTag): CompoundTag {
    const newMap = new Map(this.payload)
    other.payload.forEach((value, key) => newMap.set(key, value))
    return new CompoundTag(this.name, newMap)
  }

  protected _clonePayload(): Map<string, Tag<unknown>> {
    const newMap = new Map<string, Tag<unknown>>()
    this.payload.forEach((value, key) => {
      newMap.set(key, value.clone())
    })
    return newMap
  }
}
