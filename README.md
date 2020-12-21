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

const fromObj = {
    foo: 1,
    bar: [{baz: 2}]
}

const toObj = {
    foo: 2,
    bar: [{baz: 3}]
}

const diffResult = diff(fromObj, toObj)
// {
//   foo: { type: 'updated', from: 1, to: 2 },
//   'bar.0.baz': { type: 'updated', from: 2, to: 3 }
// }

applyDiff(fromObj, diffResult) // => toObj
reverseDiff(toObj, diffResult) // => fromObj

isEqual({foo: 1}, {foo: 1}) // => true
isEqual({foo: 1}, {foo: '1'}) // => false
```
