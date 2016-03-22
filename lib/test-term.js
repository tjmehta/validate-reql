var assert = require('assert')
var util = require('util')

var isFunction = require('101/is-function')

var termClasses = require('./term-classes.js')

var DatumTerm = termClasses.DATUM

/* validator "vals" */
module.exports = TestTerm

function TestTerm (fn) {
  DatumTerm.call(this)
  assert(isFunction(fn), '"fn" should be a function')
  // cannot be enumerable bc rethinkdb/ast.js builds each option property
  // making the fn a DatumTerm prevents serialization into ast
  // see deep-match line 21
  this.__is_rv_test_term = true
  this.fn = new DatumTerm(fn)
}
util.inherits(TestTerm, DatumTerm)
TestTerm.prototype.build = function () {
  return this.fn
}
TestTerm.prototype.compose = function () {
  return this.fn.data.toString()
}
