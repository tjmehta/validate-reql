require('../lib/patch-rethinkdb')()

var expect = require('chai').expect
var r = require('rethinkdb')

require('../lib/patch-rethinkdb.js')

var describe = global.describe
var it = global.it

describe('TestTerm tests', function () {
  it('should do it', function(done) {
    var fn = function () {}
    var x = r.rvTest(fn)
    expect(x.compose()).to.equal(fn.toString())
    done()
  })
})