module.exports = UnexpectedError

function UnexpectedError (message, data) {
  Error.call(this, message)
  this.message = message
  this.data = data
  Error.captureStackTrace(this, this.constructor)
}

require('util').inherits(UnexpectedError, Error)
