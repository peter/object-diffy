
const { diff, applyDiff, reverseDiff, isEqual, cloneObject } = require('./index')
const assertEqual = require('assert').deepStrictEqual

function expectEqual (v1, v2) {
  expect(v1).toEqual(v2)
  // NOTE: Jest doesn't handle undefined values in objects well in equality checks
  assertEqual(v1, v2)
}

function expectDiff (obj1, obj2, expectedDiff, options = {}) {
  const _obj1 = cloneObject(obj1)
  const _obj2 = cloneObject(obj2)
  const actualDiff = diff(obj1, obj2, options)
  expectEqual(actualDiff, expectedDiff)
  expectEqual(applyDiff(_obj1, actualDiff), _obj2)
  expectEqual(reverseDiff(_obj2, actualDiff), _obj1)
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
      expectDiff({ a: { b: 1, c: 2 } }, {}, { a: { type: 'deleted', from: { b: 1, c: 2 }, to: undefined } })
      expectDiff({ a: [{ b: 1, c: 2 }] }, { a: [{ c: '2', d: 3 }] }, {
        'a.0.b': { type: 'deleted', from: 1, to: undefined },
        'a.0.c': { type: 'updated', from: 2, to: '2', fromType: 'number', toType: 'string' },
        'a.0.d': { type: 'added', from: undefined, to: 3 }
      })

      expectDiff({}, { foo: 1 }, { foo: { type: 'added', from: undefined, to: 1 } })
      expectDiff({ foo: {} }, { foo: { bar: 1 } }, { 'foo.bar': { type: 'added', from: undefined, to: 1 } })
      expectDiff({}, { foo: { bar: 1 } }, { foo: { type: 'added', from: undefined, to: { bar: 1 } } })

      expectDiff({ foo: 1 }, {}, { foo: { type: 'deleted', from: 1, to: undefined } })
      expectDiff({ foo: { bar: 1 } }, { foo: {} }, { 'foo.bar': { type: 'deleted', from: 1, to: undefined } })
      expectDiff({ foo: { bar: 1 } }, { }, { foo: { type: 'deleted', from: { bar: 1 }, to: undefined } })

      expectDiff({ foo: 1 }, { foo: 2 }, { foo: { type: 'updated', from: 1, to: 2 } })
      expectDiff({ foo: { bar: 1 } }, { foo: { bar: 2 } }, { 'foo.bar': { type: 'updated', from: 1, to: 2 } })
      expectDiff({ foo: { bar: 1 } }, { foo: 1 }, { foo: { type: 'updated', from: { bar: 1 }, to: 1, fromType: 'object', toType: 'number' } })
    })

    test('can handle Date objects', () => {
      const d1 = new Date()
      const d2 = new Date()
      expectDiff({ date: d1 }, { date: d1 }, undefined)
      expectDiff({ date: d1 }, { date: d2 }, { date: { type: 'updated', from: d1, to: d2 } })
    })

    test('can return a nested diff result with the nested option', () => {
      expect(diff({ foo: {} }, { foo: { bar: 1 } }, { nested: true })).toEqual({ foo: { bar: { type: 'added', from: undefined, to: 1 } } })
    })

    test('can be configured to output shallower diffs with the recurseIf option', () => {
      const fromObj = {
        foo: {
            bar: 1,
            baz: {
                bla: 2
            }
        },
        boo: [1, 2, 3]
      }
      const toObj = {
          foo: {
              bar: 2,
              baz: {
                  bla: 3
              }
          },
          boo: [3, 2, 1]
      }
      const recurseIf = (value, path) => !Array.isArray(value) && path.length <= 1
      const options = { recurseIf }
      expectDiff(fromObj, toObj, {
        'foo.bar': { type: 'updated', from: 1, to: 2 },
        'foo.baz': { type: 'updated', from: { bla: 2 }, to: { bla: 3 } },
        'boo': { type: 'updated', from: [ 1, 2, 3 ], to: [ 3, 2, 1 ] }
      }, options)
    })
  })

  describe('isEqual', () => {
    test('can check equality for primitives, objects, and arrays', () => {
      expect(isEqual(null, null)).toEqual(true)
      expect(isEqual(undefined, undefined)).toEqual(true)
      expect(isEqual(null, undefined)).toEqual(false)
      expect(isEqual(true, true)).toEqual(true)
      expect(isEqual(true, false)).toEqual(false)
      expect(isEqual(5, 5)).toEqual(true)
      expect(isEqual(5, 6)).toEqual(false)
      expect(isEqual(5, '5')).toEqual(false)

      expect(isEqual({}, [])).toEqual(false)
      expect(isEqual({}, 5)).toEqual(false)
      expect(isEqual({foo: 1}, {foo: 1})).toEqual(true)
      expect(isEqual({foo: 1}, {foo: '1'})).toEqual(false)

      expect(isEqual([1], [1])).toEqual(true)
      expect(isEqual([1], ['1'])).toEqual(false)
      expect(isEqual([1], [1, 2])).toEqual(false)
    })
  })
})
