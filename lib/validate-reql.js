var assertArgs = require('assert-args')
var isFunction = require('101/is-function')
var rethinkdb = require('rethinkdb')
var debug = require('debug')('validate-reql')

var deepMatch = require('./deep-match.js')
var ValidationError = require('./errors/validation.js')

var isPromise = function (v) {
  return isFunction(v.then)
}

module.exports = validateReQL

/**
 * validate reql and reql opts
 * @param  {Object} reql       rethinkdb query reql
 * @param  {Object} [reqlOpts] rethinkdb reql opts
 * @param  {Array} whitelist   reql validators/queries
 * @return {Promise.<Boolean>} isValid promise
 */
function validateReQL (reql, reqlOpts, whitelist) {
  var args = assertArgs(arguments, {
    'reql': '*',
    '[reqlOpts]': 'object',
    'whitelist': 'array'
  })
  reql = args.reql
  reqlOpts = args.reqlOpts
  whitelist = args.whitelist
  var firstErr
  var errCount = 0
  var promises = whitelist.map(function (reqlValidator) {
    return validate(reql, reqlOpts, reqlValidator)
      .catch(function (err) {
        firstErr = firstErr || err
        errCount++
      })
  })
  return Promise.all(promises).then(function () {
    if (errCount === whitelist.length) {
      throw firstErr
    } else {
      return true
    }
  })
}

function validate (reql, reqlOpts, reqlValidator) {
  reqlOpts = rethinkdb.expr(reqlOpts || {})
  var validOpts = rethinkdb.expr(reqlValidator.__validOpts || {})
  var refs = {}
  // validate opts
  return deepMatch(reqlOpts, validOpts, refs)
    .catch(function (err) {
      debug('opts not allowed for %o %o %o', reql, reqlOpts, validOpts)
      throw new ValidationError('"opts" mismatch', { err: err })
    })
    .then(function () {
      // validate query
      return deepMatch(reql, reqlValidator, refs)
        .catch(function (err) {
          throw new ValidationError('"query" mismatch', { err: err })
        })
    })
    .then(function () {
      if (!reqlValidator.__validators) {
        // no custom validators
        return true
      }
      // run any custom validators
      var promises = reqlValidator.__validators.map(function (validate) {
        var ret = validate(refs)
        var boolToPromise = function (valid) {
          debug('validation failed for %o %o %s', reql, reqlOpts, validate)
          return valid
            ? Promise.resolve(true)
            : Promise.reject(new ValidationError('custom validator failed', { validator: validate }))
        }
        return isPromise(ret)
          ? ret
              .catch(function (err) {
                debug('validation failed (err) for %o %o %s', reql, reqlOpts, validate)
                throw err
              })
          : boolToPromise(ret)
      })
      return Promise.all(promises)
    })
}

