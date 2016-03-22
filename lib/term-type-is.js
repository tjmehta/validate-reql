var assertArgs = require('assert-args')
var equals = require('101/equals')
var protoDef = require('rethinkdb/proto-def')

module.exports = termTypeIs

function termTypeIs (type /*, ...keys */) {
  var args = assertArgs(arguments, {
    'type': 'number',
    '...keys': 'string'
  })
  type = args.type
  var keys = args.keys
  var compareTypes = keys.map(function (key) {
    return protoDef.Term.TermType[key]
  })
  return compareTypes.some(equals(type))
}
