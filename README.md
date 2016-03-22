# validate-reql  [![Build Status](https://travis-ci.org/tjmehta/validate-reql.svg)](https://travis-ci.org/tjmehta/validate-reql) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
allows validation of rethinkdb reql queries using a whitelist of reql validators. this was specifically designed to work w/ rethinkdb-primus.

# Installation
```bash
npm i --save rethinkdb-validator
```

# Usage

## Validate ReQL using a whitelist of _exact_ ReQL queries.

### Example: test if reql is in reql whitelist
```js
var validateReql = require('validate-reql')
var r = require('rethinkdb')

var reql = r
  .table('hello')
  .insert({ foo: 'bar' }, { durable: true })
var whitelist = [
  r
  .table('hello')
  .insert({ foo: 'bar' }, { durable: true })
]
validateReql(reql, whitelist).then(function () {
  // pass!
}).catch(...)

// Failure Cases
var reql1 = r
  .table('hello')
  .insert({ foo: 'bar' })
validateReql(reql, whitelist).catch(function (err) {
  // err is an instance of ValidationError - require('validate-reql').ValidationError
  console.log(err) // [ ValidationError: "query" mismatch ]
})
```
## Validate ReQL usng custom validation
rethinkdb-validator monkey patches rethinkdb w/ some new methods

### Example: Custom validation using refs: `r.rvRef` and `rvValidate`
// Place `r.rvRef('<name>')` in place of ReQL you want to manually validate in your whitelist ReQL
// Note: if the actual value from the ReQL is a sequence of ReQL you will have to test it as Rethink AST
```js
var validateReql = require('validate-reql')
var r = require('rethinkdb')

var reql = r
  .table('hello')
  .insert({ foo: 'bar' }, { durable: true })
var whitelist = [
  r
  .table('hello')
  .insert(r.rvRef('update'), r.rvRef('updateRef'))
  .rvValidate(function (refs) {
    console.log(refs.update) // { foo: 'bar' }
    console.log(refs.updateRef) // { durable: true }
    return true // return a boolean or promise
  })
]
validateReql(reql, whitelist).then(function () {
  // pass!
}).catch(...)
// Failure Cases
var whitelist2 = [
  r
  .table('hello')
  .insert(r.rvRef('update'), r.rvRef('updateRef'))
  .rvValidate(function (refs) {
    console.log(refs.update) // { foo: 'bar' }
    console.log(refs.updateRef) // { durable: true }
    // return a boolean or promise
    return true // pass
    return false // results in [ ValidationError: custom validation failed ], require('validate-reql/lib/errors/validate.js')
    return Promise.resolve() // pass
    return Promise.reject(new Error('boom')) // results in [ Error: boom ]
  })
]
validateReql(reql, whitelist2).catch(function (err) {
  console.log(err) // scenarios outlined above
})
```

### Example: Custom validation using property tests
// Place `r.rvTest(func)` in place of ReQL you want to manually validate inline in your whitelist ReQL
```js
var validateReql = require('validate-reql')
var r = require('rethinkdb')

var reql = r
  .table('hello')
  .insert({ foo: 'bar' })
var whitelist = [
  r
  .table('hello')
  .insert(r.rvTest(function (value, refs) {
    console.log(value) // { foo: 'bar' }
    console.log(refs) // {} note: be careful using refs in here, they may not have been read yet
    // return a boolean or promise
    return true // pass
    return false // results in [ ValidationError: custom validation failed ], require('validate-reql/lib/errors/validate.js')
    return Promise.resolve() // pass
    return Promise.reject(new Error('boom')) // results in [ Error: boom ]
  }))
]
validateReql(reql, whitelist).catch(function (err) {
  console.log(err) // scenarios outlined above
})
```

# Credits
Thank you [Mike Mintz](https://github.com/mikemintz)! Code is heavily inspired by [rethinkdb-websocket-server](https://github.com/mikemintz/rethinkdb-websocket-server)

# License
MIT
