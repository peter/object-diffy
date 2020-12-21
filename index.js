///////////////////////////////////
// Object Utility Functions
///////////////////////////////////

function isObject (value) {
  return value != null && typeof value === 'object' && value.constructor === Object
}

function cloneJsonObject (obj) {
  if (obj == null) return undefined
  return JSON.parse(JSON.stringify(obj))
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
  const result = obj == null ? {} : cloneJsonObject(obj)
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
// Diff Functions
///////////////////////////////////

function pathString (path) {
  return Array.isArray(path) ? path.join('.') : path
}

function pathArray (path) {
  return Array.isArray(path) ? path : path.split('.')
}

function valueType (value) {
  if (value === undefined) {
    return 'undefined'
  } else if (value === null) {
    return 'null'
  } else if (Array.isArray(value)) {
    return 'array'
  } else {
    // object, string, number, boolean
    return typeof value
  }
}

// Deep diff of two JSON type objects
// Similar library: https://github.com/flitbit/diff
function _diff (v1, v2, path = []) {
  const t1 = valueType(v1)
  const t2 = valueType(v2)
  if (t1 !== t2) {
    return {
      [pathString(path)]: {
        type: 'updated',
        from: v1,
        to: v2,
        typeFrom: t1,
        typeTo: t2
      }
    }
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
      return _diff(v1[index], v2[index], append(path, index))
    }))
    return arrayDiffs.reduce(merge, {})
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
      return _diff(v1[key], v2[key], append(path, key))
    })
    return concat(addDiffs, deleteDiffs, changeDiffs).reduce(merge, {})
  } else {
    if (v1 !== v2) {
      return {
        [pathString(path)]: {
          type: 'updated',
          from: v1,
          to: v2
        }
      }
    } else {
      return {}
    }
  }
}

function makeNested (diffResult) {
  return Object.keys(diffResult).reduce((acc, path) => setIn(acc, path, diffResult[path]), {})
}

function diff (fromObj, toObj, options = {}) {
  const result = _diff(fromObj, toObj)
  if (isEmpty(result)) {
    return undefined
  } else {
    return options.nested ? makeNested(result) : result
  }
}

function applyDiff (obj, diffResult, options = {}) {
  if (!diffResult) return obj
  const direction = options.direction || 'to'
  let result = cloneJsonObject(obj)
  for (const [path, pathResult] of Object.entries(diffResult)) {
    const parentPath = pathArray(path).slice(0, -1)
    const parentValue = get(result, parentPath)
    if (Array.isArray(parentValue) && ((pathResult.type === 'deleted' && direction === 'to') || (pathResult.type === 'added' && direction === 'from'))) {
      const deletedIndex = parseInt(last(pathArray(path)))
      result = setIn(result, parentPath, parentValue.filter((_, index) => index < deletedIndex))
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
  isEqual
}
