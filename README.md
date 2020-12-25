# object-diffy

A Node.js library for diffing objects with nested JSON-like data.

Features:

* Diff result output is human readable and doesn't require a manual
* Contains functions to apply and reverse a diff
* Can be used for deep equality checks
* Single file with 200 lines of plain Node.js code and no dependencies

## Installation

```sh
npm install object-diff
```

## Usage

```javascript
const { diff, applyDiff, reverseDiff, isEqual } = require('object-diffy')
const assertEqual = require('assert').deepStrictEqual

const date = new Date()

const fromObj = {
    date,
    foo: 1,
    bar: [{baz: 2}]
}

const toObj = {
    date,
    foo: '1',
    bar: [],
    bla: true
}

const diffResult = diff(fromObj, toObj)

assertEqual(
    diffResult,
    {
        foo: {type: 'updated', from: 1, to: '1', fromType: 'number', toType: 'string'},
        'bar.0': {type: 'deleted', from: {baz: 2}, to: undefined},
        bla: {type: 'added', from: undefined, to: true}
    }
)

assertEqual(
    applyDiff(fromObj, diffResult),
    toObj
)

assertEqual(
    reverseDiff(toObj, diffResult),
    fromObj
)

assertEqual(
    isEqual({foo: 1}, {foo: 1}),
    true
)

assertEqual(
    isEqual({foo: 1}, {foo: '1'}),
    false
)
```

## Options

By default the `diff` function will traverse the object tree from the top level all the way down
through arrays and child objects to the leaf values. In some circumstances maybe especially for small
object and arrays this may not be ideal as it can be hard to see the context and get an overview.
To help with this problem there is a way to tune the granularity/depth of the diff function with the `recurseIf` option as shown below:

```javascript
const { diff } = require('object-diffy')
const assertEqual = require('assert').deepStrictEqual

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

assertEqual(
    diff(fromObj, toObj),
    {
    'foo.bar': { type: 'updated', from: 1, to: 2 },
    'foo.baz.bla': { type: 'updated', from: 2, to: 3 },
    'boo.0': { type: 'updated', from: 1, to: 3 },
    'boo.2': { type: 'updated', from: 3, to: 1 }
    }
)

// Configure the diff function to not recurse into arrays and not
// recurse beyond the second nesting level
const recurseIf = (value, path) => !Array.isArray(value) && path.length <= 1
const options = { recurseIf }
assertEqual(
    diff(fromObj, toObj, options),
    {
    'foo.bar': { type: 'updated', from: 1, to: 2 },
    'foo.baz': { type: 'updated', from: { bla: 2 }, to: { bla: 3 } },
    'boo': { type: 'updated', from: [ 1, 2, 3 ], to: [ 3, 2, 1 ] }
    }
)
```
