/**
 * Primary file for API
 */

/**
 * Library './lib' dependencies
 */

let _server = require ('./lib/Server')
let _worker = require('./lib/Worker')

// Declare the app
let app = {}


app.init = ()=>{
    _server.init()

    _worker.init()
}

app.init();


// Export the app module
module.exports = app