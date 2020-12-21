
const { diff, applyDiff, reverseDiff } = require('./index')

function cloneJsonObject (obj) {
  if (obj == null) return undefined
  return JSON.parse(JSON.stringify(obj))
}

function expectDiff (obj1, obj2, expectedDiff) {
  const _obj1 = cloneJsonObject(obj1)
  const _obj2 = cloneJsonObject(obj2)
  const actualDiff = diff(obj1, obj2)
  expect(actualDiff).toEqual(expectedDiff)
  expect(applyDiff(_obj1, actualDiff)).toEqual(_obj2)
  expect(reverseDiff(_obj2, actualDiff)).toEqual(_obj1)
}

describe('object-diffy', () => {
  describe('diff', () => {
    test('returns undefined if two objects are equal', () => {
      expectDiff({}, {}, undefined)
      expectDiff({ foo: 1 }, { foo: 1 }, undefined)
      expectDiff({ foo: 1, bar: [{ baz: true }] }, { foo: 1, bar: [{ baz: true }] }, undefined)
    })

    test('returns diff object if two objects are not equal', () => {
      expectDiff({ foo: 1 }, {}, { foo: { type: 'deleted', from: 1, to: undefined } })
      expectDiff({}, { foo: 1 }, { foo: { type: 'added', from: undefined, to: 1 } })
      expectDiff({ foo: 1, bar: [true] }, { foo: 2, bar: [true] }, { foo: { type: 'updated', from: 1, to: 2 } })
      expectDiff({ foo: [1, 2], bar: [true] }, { foo: [2, 2], bar: [true] }, { 'foo.0': { type: 'updated', from: 1, to: 2 } })
    })

    test('can handle addition, deletion, and update in arrays', () => {
      expectDiff({ foo: [] }, { foo: [1] }, { 'foo.0': { type: 'added', from: undefined, to: 1 } })
      expectDiff({ foo: [1] }, { foo: [] }, { 'foo.0': { type: 'deleted', from: 1, to: undefined } })
      expectDiff({ foo: [1] }, { foo: [2] }, { 'foo.0': { type: 'updated', from: 1, to: 2 } })
      expectDiff({ foo: [1, 2, 3] }, { foo: [0, 2] },
        { 'foo.0': { type: 'updated', from: 1, to: 0 }, 'foo.2': { type: 'deleted', from: 3, to: undefined } })
      // delete several items
      expectDiff({ foo: [1, 2, 3, 4] }, { foo: [1] }, {
        'foo.1': { type: 'deleted', from: 2, to: undefined },
        'foo.2': { type: 'deleted', from: 3, to: undefined },
        'foo.3': { type: 'deleted', from: 4, to: undefined }
      })
      // add several items
      expectDiff({ foo: [1] }, { foo: [1, 2, 3, 4] }, {
        'foo.1': { type: 'added', from: undefined, to: 2 },
        'foo.2': { type: 'added', from: undefined, to: 3 },
        'foo.3': { type: 'added', from: undefined, to: 4 }
      })
    })

    test('objects nested in arrays', () => {
      // update property in object
      expectDiff({ foo: [{ bar: 1 }] }, { foo: [{ bar: 2 }] }, { 'foo.0.bar': { type: 'updated', from: 1, to: 2 } })
      // add/delete properties in object (swapping two objects)
      expectDiff({ foo: [{ bar: 1 }, { baz: 2 }] }, { foo: [{ baz: 2 }, { bar: 1 }] },
        {
          'foo.0.bar': { type: 'deleted', from: 1, to: undefined },
          'foo.0.baz': { type: 'added', from: undefined, to: 2 },
          'foo.1.bar': { type: 'added', from: undefined, to: 1 },
          'foo.1.baz': { type: 'deleted', from: 2, to: undefined }
        })
      // Add object
      expectDiff({ foo: [{ bar: 1 }] }, { foo: [{ bar: 1 }, { bar: 2 }] }, { 'foo.1': { type: 'added', from: undefined, to: { bar: 2 } } })
      // Remove object
      expectDiff({ foo: [{ bar: 1 }, { baz: 2 }] }, { foo: [{ bar: 1 }] }, { 'foo.1': { type: 'deleted', from: { baz: 2 }, to: undefined } })
    })

    test('can handle deep addition, deletion, and update in objects', () => {
      expectDiff({}, { foo: 1 }, { foo: { type: 'added', from: undefined, to: 1 } })
      expectDiff({ foo: {} }, { foo: { bar: 1 } }, { 'foo.bar': { type: 'added', from: undefined, to: 1 } })
      expectDiff({}, { foo: { bar: 1 } }, { foo: { type: 'added', from: undefined, to: { bar: 1 } } })

      expectDiff({ foo: 1 }, {}, { foo: { type: 'deleted', from: 1, to: undefined } })
      expectDiff({ foo: { bar: 1 } }, { foo: {} }, { 'foo.bar': { type: 'deleted', from: 1, to: undefined } })
      expectDiff({ foo: { bar: 1 } }, { }, { foo: { type: 'deleted', from: { bar: 1 }, to: undefined } })

      expectDiff({ foo: 1 }, { foo: 2 }, { foo: { type: 'updated', from: 1, to: 2 } })
      expectDiff({ foo: { bar: 1 } }, { foo: { bar: 2 } }, { 'foo.bar': { type: 'updated', from: 1, to: 2 } })
      expectDiff({ foo: { bar: 1 } }, { foo: 1 }, { foo: { type: 'updated', from: { bar: 1 }, to: 1, typeFrom: 'object', typeTo: 'number' } })
    })

    test('can return a nested diff result with the nested option', () => {
      expect(diff({ foo: {} }, { foo: { bar: 1 } }, { nested: true })).toEqual({ foo: { bar: { type: 'added', from: undefined, to: 1 } } })
    })
  })
})
