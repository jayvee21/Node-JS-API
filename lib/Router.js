/**
 * Routes the request
 */

/**
 * Lib dependencies
 */

let _handlers = require('./Handler')

let router = {
    'ping': _handlers.ping,
    'users': _handlers.users,
    'tokens': _handlers.tokens,
    'checks': _handlers.checks,
    'notFound': _handlers.notFound
}



module.exports = router