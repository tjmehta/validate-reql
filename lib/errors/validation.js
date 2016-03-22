module.exports = ValidationError

function ValidationError (message, data) {
  Error.call(this, message)
  this.message = message
  this.data = data
  Error.captureStackTrace(this, this.constructor)
}

require('util').inherits(ValidationError, Error)
