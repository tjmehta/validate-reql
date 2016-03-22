var debug = require('debug')('validate-reql:deep-match')
var deepEqual = require('deep-equal')
var isFunction = require('101/is-function')
var isObject = require('101/is-object')

var termTypeIs = require('./term-type-is.js')
var TestTerm = require('./test-term.js')
var ValidationError = require('./errors/validation.js')

var boolToPromise = function (bool, errMessage) {
  return bool
    ? Promise.resolve(true)
    : Promise.reject(new ValidationError(errMessage))
}

module.exports = deepMatch

function deepMatch (actual, validator, _refs, _varIdMap) {
  debug('deepMatch\n %o', arguments)
  // assert(actual, '"actual" is required')
  // assert(validator, '"validator" is required')
  actual = isFunction(actual && actual.build) ? actual.build() : actual
  validator = isFunction(validator && validator.build) ? validator.build() : validator
  if (validator && validator.fn && validator.__is_rv_test_term) {
    debug('validator opts\n %o\n %o', validator, actual)
    validator = TestTerm.prototype.build.call(validator)
    debug('validator opts build\n %o\n %o', validator, actual)
  }
  _refs = _refs || {}
  _varIdMap = _varIdMap || {}

  if (isFunction(validator)) {
    debug('validator is function\n %o\n %o', actual, _refs)
    return new Promise(function (resolve, reject) {
      if (!validator(actual, _refs)) {
        reject(new ValidationError('value did not pass test'))
        return
      }
      resolve(true)
    })
  } else if (Array.isArray(validator)) {
    var termId = actual[0]
    var termArgs = actual[1]
    var termOpts = actual[2]
    var validatorTermId = validator[0]
    var validatorTermArgs = validator[1]
    var validatorTermOpts = validator[2]
    debug('validator is array\n %o\n %o\n %o\n %o\n %o\n %o',
      termId,
      termArgs,
      termOpts,
      validatorTermId,
      validatorTermArgs,
      validatorTermOpts)

    if (termId !== validatorTermId) {
      debug('term ids mismatch %o %o', termId, validatorTermId)
      return Promise.reject(new ValidationError('term ids mismatch'))
    }

    return deepMatch(termOpts || {}, validatorTermOpts || {}, _refs, _varIdMap)
      .catch(function (err) {
        debug('term opts mismatch\n %o\n %o', termOpts, validatorTermOpts)
        err instanceof ValidationError
          ? err.message = 'term opts mismatch: ' + err.message
          : err
        throw err
      })
      .then(function () {
        if (termTypeIs(validatorTermId, 'VAR')) {
          validatorTermArgs = validatorTermArgs.map(function (id) {
            debug('_varIdMap cache\n %o', _varIdMap)
            return _varIdMap[id]
          })
          debug('term is VAR\n %o\n %o', termArgs, validatorTermArgs)
          var argsMatch = deepEqual(termArgs, validatorTermArgs, { strict: true })
          return boolToPromise(argsMatch, 'term args mismatch')
        } else if (termTypeIs(validatorTermId, 'FUNC')) {
          var termVarIds = termArgs[0][1]
          var validatorTermVarIds = validatorTermArgs[0][1]
          debug('term is FUNC\n %o\n %o', termVarIds, validatorTermVarIds)
          // Commented out for now: arg length may not indicate a diff query
          // if (termVarIds.length !== validatorTermVarIds.length) {
          //   return false
          // }
          validatorTermVarIds.forEach(function (varId, i) {
            debug('_varIdMap val\n %o\n %o', varId, termVarIds[i])
            _varIdMap[varId] = termVarIds[i]
          })
          termArgs = termArgs.slice(1)
          validatorTermArgs = validatorTermArgs.slice(1)
          debug('FUNC args\n %o\n %o', termArgs, validatorTermArgs)
        }
        // make sure all args
        var funcArgsMatch = termArgs.map(function (arg, i) {
          debug('FUNC map arg\n %o\n %o', arg, validatorTermArgs[i])
          return deepMatch(arg, validatorTermArgs[i], _refs, _varIdMap)
        })
        return Promise.all(funcArgsMatch).catch(function (err) {
          err instanceof ValidationError
            ? err.message = 'func term args mismatch: ' + err.message
            : err
          throw err
        }).then(function () {
          return true
        })
      })
  } else if (isObject(validator)) {
    debug('validator is object\n %o\n %o', actual, validator)
    if (!isObject(actual) || Object.keys(validator).length !== Object.keys(actual).length) {
      return Promise.reject(new ValidationError('object mismatch'))
    }
    var objsMatch = Object.keys(validator).map(function (key) {
      var valItem = validator[key]
      var actualItem = actual[key]
      return deepMatch(actualItem, valItem, _refs, _varIdMap)
    })
    return Promise.all(objsMatch).catch(function (err) {
      err instanceof ValidationError
        ? err.message = 'object mismatch: ' + err.message
        : err
      throw err
    }).then(function () {
      return true
    })
  } else {
    return boolToPromise(actual === validator, 'values mismatch')
  }
}
