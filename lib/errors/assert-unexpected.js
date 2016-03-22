var UnexpectedError = require('./unexpected.js')

module.exports = assertUnexpected

function assertUnexpected (statement, msg, data) {
  if (!statement) {
    throw new UnexpectedError(msg, data)
  }
}
