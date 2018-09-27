/**
 * Server related library
 */

let http = require('http')
let url = require('url')
let stringDecoder = require('string_decoder').StringDecoder
let server = {}

/**
 * Lib dependencies
 */
let _router = require('./Router') 
let _helper = require('./Helper')
let _config = require('./Config')
let _fs = require('./FileSystem')


/**
 * HTTP Server
 */
server.httServer = http.createServer( (req, res)=>{
    server.unifiedServer(req, res)
})

/**
 * Handles the HTTP and HTTPS request
 */

server.unifiedServer = (req, res)=>{
    let parseURL = url.parse(req.url, true)
    let pathName = parseURL.pathname.toLowerCase()
    let trimmedPath = pathName.replace(/^\/+|\/$/g,'')
    // Request Query
    let queryStringObject = parseURL.query
    // Method
    let method = req.method
    // Request Headers
    let headers = req.headers
    // Request Payload
    let buffer = ''
    let decoder = new stringDecoder()

    // Emit request data
    req.on('data', (data)=>{
        buffer += decoder.write(data)
    })

    req.on('end', ()=>{
        
        buffer += decoder.end()

        server.selectedHandler = typeof(_router[trimmedPath]) != 'undefined'
                                 ? _router[trimmedPath] : _router.notFound
        let data = {
            'path': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': _helper.strToJson(buffer)
        }

        server.selectedHandler(data, (statusCode, payload)=>{
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200
            payload = typeof(payload) == 'object' ? payload : {}
            // Convert the payload object to string before sending as response
            let strPayload = _helper.jsonToString(payload)
            res.writeHead(statusCode, {'Content-type': 'txt/json'})
            res.write(strPayload)
            res.end()
        })
    })
}

/**
 * Initialize the application
 */

server.init = ()=>{

    server.httServer.listen(_config.port, function(){
        console.log("API IS RUNIING: Port", _config.port )
    })
}


// Export the server
module.exports = server