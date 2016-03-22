require('../lib/patch-rethinkdb')()

var expect = require('chai').expect
var r = require('rethinkdb')
var sinon = require('sinon')
require('sinon-as-promised')

var validateReQL = require('../lib/validate-reql.js')
var ValidationError = require('../lib/errors/validation.js')

var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it

describe('validate-reql tests', function () {
  beforeEach(function (done) {
    this.context = {}
    done()
  })

  it('should validate reql if reql matches', function (done) {
    var self = this
    var validateFn = sinon.stub().returns(true)
    var update = {}
    var updateOpts = {}
    var reql = r
      .table('posts')
      .insert(update, updateOpts)
    var validator = r
      .table('posts')
      .insert(update, updateOpts)
    var whitelist = [ validator ]

    validateReQL(reql, {}, whitelist)
      .then(function (pass) {
        expect(pass).to.be.true
        done()
      })
      .catch(done)
  })

  it('should validate reql using validator', function (done) {
    var self = this
    var validateFn = sinon.stub().returns(true)
    var update = {}
    var updateOpts = {}
    var reql = r
      .table('posts')
      .insert(update, updateOpts)
    var validator = r
      .table('posts')
      .insert(r.rvRef('update'), r.rvRef('opts'))
      .rvValidate(validateFn)
    var whitelist = [ validator ]

    validateReQL(reql, {}, whitelist)
      .then(function (pass) {
        var expectedRefs = {
          update: update,
          opts: updateOpts
        }
        sinon.assert.calledOnce(validateFn)
        sinon.assert.calledWith(
          validateFn, expectedRefs)
        expect(pass).to.be.true
        done()
      })
      .catch(done)
  })

  it('should invalidate reql if opts mismatch', function (done) {
    var self = this
    var validateFn = sinon.stub().returns(true)
    var update = {}
    var updateOpts = {}
    var reql = r
      .table('posts')
      .insert(update, updateOpts)
    var validator = r
      .table('posts')
      .insert(r.rvRef('update'), r.rvRef('opts'))
      .rvOpts({ 'db': 'database' })
      .rvValidate(validateFn)
    var whitelist = [ validator ]

    validateReQL(reql, {}, whitelist)
      .then(function () {
        done(new Error('expected an error'))
      })
      .catch(function (err) {
        expect(err).to.be.an.instanceOf(ValidationError)
        expect(err.message).to.match(/"opts" mismatch/)
        done()
      })
      .catch(done)
  })

  it('should invalidate reql if reql mismatch', function (done) {
    var self = this
    var validateFn = sinon.stub().returns(true)
    var update = {}
    var updateOpts = {}
    var reql = r
      .table('posts')
      .insert(update, updateOpts)
    var validator = r
      .table('posts')
      .get(r.rvRef('get'), r.rvRef('opts'))
    var whitelist = [ validator ]

    validateReQL(reql, {}, whitelist)
      .then(function () {
        done(new Error('expected an error'))
      })
      .catch(function (err) {
        expect(err).to.be.an.instanceOf(ValidationError)
        expect(err.message).to.match(/"query" mismatch/)
        done()
      })
      .catch(done)
  })

  it('should invalidate reql using validator (rejected w/ err)', function (done) {
    var self = this
    var validateFn = sinon.stub().returns(false)
    var update = {}
    var updateOpts = {}
    var reql = r
      .table('posts')
      .insert(update, updateOpts)
    var validator = r
      .table('posts')
      .insert(r.rvRef('update'), r.rvRef('opts'))
      .rvValidate(validateFn)
    var whitelist = [ validator ]

    validateReQL(reql, null, whitelist)
      .then(function () {
        done(new Error('expected an error'))
      })
      .catch(function (err) {
        var expectedRefs = {
          update: update,
          opts: updateOpts
        }
        sinon.assert.calledOnce(validateFn)
        sinon.assert.calledWith(
          validateFn, expectedRefs)
        expect(err).to.be.an.instanceOf(ValidationError)
        expect(err.message).to.match(/custom validator/)
        done()
      })
      .catch(done)
  })

  it('should invalidate reql using validator (rejected w/ err)', function (done) {
    var self = this
    var validateFn = sinon.stub().rejects(new Error('boom'))
    var update = {}
    var updateOpts = {}
    var reql = r
      .table('posts')
      .insert(update, updateOpts)
    var validator = r
      .table('posts')
      .insert(r.rvRef('update'), r.rvRef('opts'))
      .rvValidate(validateFn)
    var whitelist = [ validator ]

    validateReQL(reql, null, whitelist)
      .then(function () {
        done(new Error('expected an error'))
      })
      .catch(function (err) {
        var expectedRefs = {
          update: update,
          opts: updateOpts
        }
        sinon.assert.calledOnce(validateFn)
        sinon.assert.calledWith(
          validateFn, expectedRefs)
        expect(err).to.be.an.instanceOf(Error)
        expect(err.message).to.match(/boom/)
        done()
      })
      .catch(done)
  })
})
