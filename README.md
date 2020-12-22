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
const { diff, applyDiff, reverseDiff, isEqual } = require('./index')
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
