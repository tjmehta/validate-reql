var assert = require('assert')
var util = require('util')

var rethinkdb = require('rethinkdb')

var forEach = require('object-loops/for-each')
var isFunction = require('101/is-function')
var isObject = require('101/is-object')
var isString = require('101/is-string')

var termClasses = require('./term-classes.js')
var TestTerm = require('./test-term.js')

var DatumTerm = termClasses.DATUM
var TermBase = DatumTerm
  .__super__.constructor
  .__super__.constructor

function createRef (name) {
  assert(isString(name), '"name" should be a string')
  return new TestTerm(function (value, refs, context) {
    refs[name] = value
    return true
  })
}

function createTest (fn) {
  assert(isFunction(fn), '"fn" should be a function')
  return new TestTerm(fn)
}

/* validator "funcs" */
function validate (validator) {
  this.__validators = this.__validators || []
  this.__validators.push(validator)
  return this
}

function validateOpt (key, val) {
  assert(isString(key), '"key" should be a string')
  this.__validOpts = this.__validOpts || {}
  this.__validOpts[key] = val
  return this
}

function validateOpts (obj) {
  assert(isObject(obj), '"obj" should be an object')
  var self = this
  forEach(obj, function (val, key) {
    self.rvOpt(key, val)
  })
  return this
}

// exports
module.exports = patchRethinkDB
module.exports.TestTerm = TestTerm

function patchRethinkDB () {
  // extend reql root
  rethinkdb.rvRef = rethinkdb.rvRef || createRef
  rethinkdb.rvTest = rethinkdb.rvTest || createTest
  // extend term base
  TermBase.prototype.rvValidate = TermBase.prototype.rvValidate || validate
  TermBase.prototype.rvOpt = TermBase.prototype.rvOpt || validateOpt
  TermBase.prototype.rvOpts = TermBase.prototype.rvOpts || validateOpts
}