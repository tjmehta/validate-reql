require('../lib/patch-rethinkdb')()

var assert = require('assert')

var createCount = require('callback-count')
var expect = require('chai').expect
var equals = require('101/equals')
var isObject = require('101/is-object')
var isString = require('101/is-string')
var not = require('101/not')
var r = require('rethinkdb')

var deepMatch = require('../lib/deep-match.js')
var reqlQueries = require('./fixtures/reql-queries.js')
var ValidationError = require('../lib/errors/validation.js')

var assertIsString = function (val) {
  assert(isString(val), 'val must be a string')
}
var assertEquals = function (compare) {
  return function (val) {
    assert(val === compare, 'val must equal compare')
  }
}

var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it

describe('deep-match tests', function () {
  describe('reql to reql', function () {
    beforeEach(function (done) {
      this.context = {}
      done()
    })

    describe('exact matches', function () {
      var whitelist = reqlQueries()
      var acceptedQueries = whitelist

      acceptedQueries.forEach(function (query, i) {
        it('should deep match reql to reql ' + i, function (done) {
          var ret = deepMatch(query, whitelist[i])
            .then(function (ret) {
              expect(ret).to.be.true
              done()
            })
            .catch(done)
        })
      })
    })

    describe('complete non-matches', function () {
      var whitelist = reqlQueries()
      var acceptedQueries = reqlQueries().reverse()

      acceptedQueries.forEach(function (query, i) {
        // skip exact match
        if (query === whitelist[i]) { return }
        it('should not match diff reqls ' + i, function (done) {
          var ret = deepMatch(query, whitelist[i])
          ret
            .then(function () {
              console.log(arguments)
              done(new Error('expected an error'))
            })
            .catch(function (err) {
              expect(err).to.be.an.instanceOf(ValidationError)
              done()
            })
        })
      })
    })

    describe('exact non-match arg prop', function () {
      it('should not match reqls w/ diff options', function (done) {
        var reql1 = r.table('posts').insert({
          id: 1,
          title: 'Lorem ipsum',
          content: 'FOOOOO'
        })
        var reql2 = r.table('posts').insert({
          id: 1,
          title: 'Lorem ipsum',
          content: 'BARRRRRRR'
        })
        deepMatch(reql1, reql2)
          .then(function () {
            done(new Error('expected an error'))
          })
          .catch(function (err) {
            expect(err).to.be.an.instanceOf(ValidationError)
            done()
          })
      })
    })

    describe('term args non-match', function () {
      it('should not match reqls w/ diff options', function (done) {
        var reql1 = r.table('posts').insert({
          id: 1,
          title: 'Lorem ipsum',
          content: 'Dolor sit amet'
        })
        var reql2 = r.table('posts').insert({
          id: 1,
          title: 'Lorem ipsum',
          content: 'Dolor sit amet'
        }, { durability: 'hard' })
        var next = createCount(2, done).next
        deepMatch(reql1, reql2)
          .then(function () {
            next(new Error('expected an error'))
          })
          .catch(function (err) {
            expect(err).to.be.an.instanceOf(ValidationError)
            next()
          })
        deepMatch(reql2, reql1)
          .then(function () {
            next(new Error('expected an error'))
          })
          .catch(function (err) {
            expect(err).to.be.an.instanceOf(ValidationError)
            next()
          })
      })
    })

    describe('literal', function () {
      it('should not pass comparing literal to non-literal refs', function (done) {
        var reql1 = r
          .table('posts')
          .insert({}, {})
        var reql2 = r
          .table('posts')
          .insert(r.literal({}), {})
        var next = createCount(2, done).next
        deepMatch(reql1, reql2)
          .then(function () {
            next(new Error('expected an error'))
          })
          .catch(function (err) {
            expect(err).to.be.an.instanceOf(ValidationError)
            next()
          })
        deepMatch(reql2, reql1)
          .then(function () {
            next(new Error('expected an error'))
          })
          .catch(function (err) {
            expect(err).to.be.an.instanceOf(ValidationError)
            next()
          })
      })
    })

    describe('func args', function () {
      it('should match reqls that are the same', function (done) {
        var reql1 = r.table('users').filter(function (doc) {
          return doc('age').eq(30)
        })
        var reql2 = r.table('users').filter(function (doc) {
          return doc('age').eq(30)
        })
        deepMatch(reql1, reql2)
          .then(function (ret) {
            expect(ret).to.be.true
            done()
          })
          .catch(done)
      })

      it('should match same reqls w/ diff arg lengths', function (done) {
        var reql1 = r.table('users').filter(function (doc) {
          return doc('age').eq(30)
        })
        var reql2 = r.table('users').filter(function (doc, wut) {
          return doc('age').eq(30)
        })
        deepMatch(reql1, reql2)
          .then(function (ret) {
            expect(ret).to.be.true
            done()
          })
          .catch(done)
      })

      it('should not match diff reqls w/ diff arg usage', function (done) {
        var reql1 = r.table('users').filter(function (doc) {
          return doc('age').eq(30)
        })
        var reql2 = r.table('users').filter(function (doc, wut) {
          return doc('age').eq(wut)
        })
        deepMatch(reql1, reql2)
          .then(function () {
            done(new Error('expected an error'))
          })
          .catch(function (err) {
            expect(err).to.be.an.instanceOf(ValidationError)
            done()
          })
      })
    })

    describe('custom validators', function () {
      describe('rvTest', function () {
        it('should pass if validator returns true', function (done) {
          var reql1 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
            content: 'FOOBARQUX'
          })
          var reql2 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
            content: r.rvTest(equals('FOOBARQUX'))
          })
          deepMatch(reql1, reql2)
            .then(function (ret) {
              expect(ret).to.be.true
              done()
            })
            .catch(done)
        })

        it('should fail if validator returns false', function (done) {
          var reql1 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
            content: 'NOT_MATCHING'
          })
          var reql2 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
            content: r.rvTest(equals('NONONONO'))
          })
          deepMatch(reql1, reql2)
            .then(function () {
              done(new Error('expected an error'))
            })
            .catch(function (err) {
              expect(err).to.be.an.instanceOf(ValidationError)
              done()
            })
        })

        it('should pass if validator returns true', function (done) {
          var reql1 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
          })
          var reql2 = r
            .table('posts')
            .insert(r.rvTest(isObject), r.rvTest(isObject))
          deepMatch(reql1, reql2)
            .then(function (ret) {
              expect(ret).to.be.true
              done()
            })
            .catch(done)
        })

        it('should fail if opts validator returns false', function(done) {
          var reql1 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
          }, { durable: true })
          var reql2 = r
            .table('posts')
            .insert(r.rvTest(isObject), r.rvTest(isString))
          deepMatch(reql1, reql2)
            .then(function () {
              done(new Error('expected an error'))
            })
            .catch(function (err) {
              expect(err).to.be.an.instanceOf(ValidationError)
              done()
            })
        })

        it('should fail if validator returns false', function (done) {
          var reql1 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
            content: 'NOT_MATCHING'
          })
          var reql2 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
            content: r.rvTest(equals('NONONONO'))
          })
          deepMatch(reql1, reql2)
            .then(function () {
              done(new Error('expected an error'))
            })
            .catch(function (err) {
              expect(err).to.be.an.instanceOf(ValidationError)
              done()
            })
        })

        it('should fail if opts validator throws err', function(done) {
          var reql1 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
          }, { durable: true })
          var reql2 = r
            .table('posts')
            .insert(r.rvTest(isObject), r.rvTest(assertIsString))
          deepMatch(reql1, reql2)
            .then(function () {
              done(new Error('expected an error'))
            })
            .catch(function (err) {
              expect(err).to.not.be.an.instanceOf(ValidationError)
              done()
            })
        })

        it('should fail if validator throws err', function (done) {
          var reql1 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
            content: 'NOT_MATCHING'
          })
          var reql2 = r.table('posts').insert({
            id: 1,
            title: 'Lorem ipsum',
            content: r.rvTest(assertEquals('NONONONO'))
          })
          deepMatch(reql1, reql2)
            .then(function () {
              done(new Error('expected an error'))
            })
            .catch(function (err) {
              expect(err).to.not.be.an.instanceOf(ValidationError)
              done()
            })
        })
      })

      describe('rvRef', function () {
        it('should pass for any refs', function (done) {
          var reql1 = r
            .table('posts')
            .insert({
              id: 1,
              title: 'Lorem ipsum',
            }, { durable: true })
          var reql2 = r
            .table('posts')
            .insert({
              id: r.rvRef('id'),
              title: r.rvRef('title')
            }, {
              durable: r.rvRef('durable')
            })
          var refs = {}

          deepMatch(reql1, reql2, refs)
            .then(function (ret) {
              expect(ret).to.be.true
              expect(refs).to.deep.equal({
                id: 1,
                title: 'Lorem ipsum',
                durable: true
              })
              done()
            })
            .catch(done)
        })

        it('should pass for any full refs', function (done) {
          var reql1 = r
            .table('posts')
            .insert(r.literal({}), {})
          var reql2 = r
            .table('posts')
            .insert(r.rvRef('update'), r.rvRef('opts'))
          var refs = {}
          deepMatch(reql1, reql2, refs)
            .then(function (ret) {
              expect(ret).to.be.true
              expect(refs).to.deep.equal({
                update: r.literal({}).build(),
                opts: {}
              })
              done()
            })
            .catch(done)
        })

        it('should fail if data has more keys than refs', function (done) {
          var reql1 = r
            .table('posts')
            .insert({
              id: 1,
              title: 'Lorem ipsum',
              extra: 'error'
            }, { durable: true })
          var reql2 = r
            .table('posts')
            .insert({
              id: r.rvRef('id'),
              title: r.rvRef('title')
            }, {
              durable: r.rvRef('durable')
            })
          deepMatch(reql1, reql2)
            .then(function () {
              done(new Error('expected an error'))
            })
            .catch(function (err) {
              expect(err).to.be.an.instanceOf(ValidationError)
              done()
            })
        })

        it('should fail if refs has more keys than data', function (done) {
          var reql1 = r
            .table('posts')
            .insert({
              id: 1,
              title: 'Lorem ipsum'
            }, { durable: true })
          var reql2 = r
            .table('posts')
            .insert({
              id: r.rvRef('id'),
              title: r.rvRef('title'),
              extra: r.rvRef('extra')
            }, {
              durable: r.rvRef('durable')
            })
          deepMatch(reql1, reql2)
            .then(function () {
              done(new Error('expected an error'))
            })
            .catch(function (err) {
              expect(err).to.be.an.instanceOf(ValidationError)
              done()
            })
        })
      })
    })
  })
})
