///////////////////////////////////
// Object Utility Functions
///////////////////////////////////

function isObject (value) {
  return value != null && typeof value === 'object' && value.constructor === Object
}

function cloneObject (obj) {
  if (Array.isArray(obj)) {
    return obj.map(v => cloneObject(v))
  } else if (isObject(obj)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = cloneObject(obj[key])
      return acc
    }, {})
  } else {
    return obj
  }
}

// Similar to https://lodash.com/docs#isEmpty
function isEmpty (value) {
  if (value == null) {
    return true
  } else if (isObject(value) && Object.keys(value).length === 0) {
    return true
  } else if (Array.isArray(value) || typeof value === 'string') {
    return value.length === 0
  } else {
    return false
  }
}

function merge (toObj, fromObj) {
  const objects = [toObj, fromObj].filter(Boolean)
  const args = [{}].concat(objects)
  return Object.assign.apply(null, args)
}

// Similar to https://lodash.com/docs/#mapValues
function mapObj (obj, valueTransform) {
  if (obj == null) return undefined
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key] = valueTransform(value, key)
    return acc
  }, {})
}

// Similar to http://ramdajs.com/docs/#path and https://lodash.com/docs#get
// but can additionally map over (reach into) objects in arrays.
function get (obj, path, defaultValue) {
  if (!obj || !path) return undefined
  path = Array.isArray(path) ? path : path.split('.')
  let result = obj
  for (const [index, key] of path.entries()) {
    if (Array.isArray(result) && (key || '').startsWith('[]')) {
      const arrayPath = [key.substring(2), ...path.slice(index + 1)]
      return result.map(item => get(item, arrayPath, defaultValue))
    }
    const value = (result && result[key])
    if (value === undefined) {
      return defaultValue
    } else {
      result = value
    }
  }
  return result
}

function updateIn (obj, path, updateFn) {
  path = Array.isArray(path) ? path : path.split('.')
  const result = obj == null ? {} : cloneObject(obj)
  let nested = result
  for (let i = 0; i < path.length - 1; ++i) {
    let value = nested[path[i]]
    if (value == null) {
      value = {}
      nested[path[i]] = value
    }
    nested = value
  }
  const leaf = path[path.length - 1]
  nested[leaf] = updateFn(nested[leaf])
  return result
}

// See:
// http://ramdajs.com/docs/#assocPath
// https://clojuredocs.org/clojure.core/assoc-in
function setIn (obj, path, value) {
  return updateIn(obj, path, () => value)
}

///////////////////////////////////
// Array Utility Functions
///////////////////////////////////

// See https://lodash.com/docs#uniq
function uniq (list) {
  return Array.from(new Set(list))
}

// See https://lodash.com/docs#concat
function concat (...arrays) {
  return arrays.filter(Boolean).reduce((a1, a2) => a1.concat(a2), [])
}

// See https://lodash.com/docs#intersection
function intersection (array1, array2) {
  const values1 = array1 || []
  const values2 = array2 || []
  return uniq(values1.filter(v => values2.includes(v)))
}

// See https://lodash.com/docs#difference
function difference (array1, array2) {
  const values1 = array1 || []
  const values2 = array2 || []
  return uniq(values1.filter(v => !values2.includes(v)))
}

function append (array, ...values) {
  return [...(array || []), ...values]
}

function range (from, to) {
  if (from == null || to == null) return []
  const result = []
  for (let i = from; i < to; ++i) {
    result.push(i)
  }
  return result
}

// See https://lodash.com/docs#head
function first (array) {
  return array ? array[0] : undefined
}

// See https://lodash.com/docs/#last
function last (array) {
  return array ? array[array.length - 1] : undefined
}

///////////////////////////////////
// Type Utility Functions
///////////////////////////////////

// Similar to: https://github.com/jonschlinkert/kind-of/blob/master/index.js
function typeOf (value) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'number' && isNaN(value)) return 'NaN'
  if (value === Infinity) return "Infinity";
  if (Array.isArray(value)) return 'array'
  if (value instanceof Date) return 'date'
  if (value instanceof Error) return 'error'
  if (value instanceof RegExp) return 'regexp'
  return typeof value
}

///////////////////////////////////
// Diff Functions
///////////////////////////////////

function pathString (path) {
  return Array.isArray(path) ? path.join('.') : path
}

function pathArray (path) {
  return Array.isArray(path) ? path : path.split('.')
}

// Deep diff of two JSON type objects
// Similar library: https://github.com/flitbit/diff
function _diff (v1, v2, options = {}, path = []) {
  const t1 = typeOf(v1)
  const t2 = typeOf(v2)
  const recurseIf = options.recurseIf || (() => true)
  const updatedDiff = {
    [pathString(path)]: {
      type: 'updated',
      from: v1,
      to: v2
    }
  }
  if (t1 !== t2) {
    return mapObj(updatedDiff, (diff) => {
      return {
        ...diff,
        fromType: t1,
        toType: t2
      }
    })
  }
  if (t1 === 'array') {
    let arrayDiffs = []
    if (v1.length > v2.length) {
      // deleted items
      arrayDiffs = range(v2.length, v1.length).map((index) => {
        return {
          [pathString(append(path, index))]: { type: 'deleted', from: v1[index], to: undefined }
        }
      })
    } else if (v1.length < v2.length) {
      // added items
      arrayDiffs = range(v1.length, v2.length).map((index) => {
        return {
          [pathString(append(path, index))]: { type: 'added', from: undefined, to: v2[index] }
        }
      })
    }
    // changed items
    const diffLength = Math.min(v1.length, v2.length)
    arrayDiffs = concat(arrayDiffs, range(0, diffLength).map((index) => {
      return _diff(v1[index], v2[index], options, append(path, index))
    }))
    arrayDiffs = arrayDiffs.reduce(merge, {})
    if (recurseIf(v1, path)) {
      return arrayDiffs
    } else if (!isEmpty(arrayDiffs)) {
      return updatedDiff
    }
  } else if (t1 === 'object') {
    const keys1 = Object.keys(v1)
    const keys2 = Object.keys(v2)
    const addDiffs = difference(keys2, keys1).map((key) => {
      return {
        [pathString(append(path, key))]: { type: 'added', from: undefined, to: v2[key] }
      }
    })
    const deleteDiffs = difference(keys1, keys2).map((key) => {
      return {
        [pathString(append(path, key))]: { type: 'deleted', from: v1[key], to: undefined }
      }
    })
    const changeDiffs = intersection(keys1, keys2).map((key) => {
      return _diff(v1[key], v2[key], options, append(path, key))
    })
    const objectDiffs = concat(addDiffs, deleteDiffs, changeDiffs).reduce(merge, {})
    if (recurseIf(v1, path)) {
      return objectDiffs
    } else if (!isEmpty(objectDiffs)) {
      return updatedDiff
    }
  } else {
    if ((t1 === 'date' && v1.getTime() !== v2.getTime()) || v1 !== v2) {
      return updatedDiff
    } else {
      return {}
    }
  }
}

function makeNested (diffResult) {
  return Object.keys(diffResult).reduce((acc, path) => setIn(acc, path, diffResult[path]), {})
}

function diff (fromObj, toObj, options = {}) {
  const result = _diff(fromObj, toObj, options)
  if (isEmpty(result)) {
    return undefined
  } else {
    return options.nested ? makeNested(result) : result
  }
}

function applyDiff (obj, diffResult, options = {}) {
  if (!diffResult) return obj
  const direction = options.direction || 'to'
  let result = cloneObject(obj)
  for (const [path, pathResult] of Object.entries(diffResult)) {
    const parentPath = pathArray(path).slice(0, -1)
    const parentValue = get(result, parentPath)
    if ((pathResult.type === 'deleted' && direction === 'to') || (pathResult.type === 'added' && direction === 'from')) {
      const deletedKey = last(pathArray(path))
      if (Array.isArray(parentValue)) {
        result = setIn(result, parentPath, parentValue.filter((_, index) => index < parseInt(deletedKey)))
      } else if (isObject(parentValue)) {
        delete parentValue[deletedKey]
      }
    } else {
      result = setIn(result, path, pathResult[direction])
    }
  }
  return result
}

function reverseDiff (obj, diffResult) {
  return applyDiff(obj, diffResult, { direction: 'from' })
}

function isEqual (obj1, obj2) {
  return diff(obj1, obj2) === undefined
}

module.exports = {
  diff,
  applyDiff,
  reverseDiff,
  isEqual,
  cloneObject
}
