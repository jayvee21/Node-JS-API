/**
 * Handles requests
 */
let handlers = {}

/**
 * Library dependencies
 */
let _fs = require('./FileSystem')
let _helper = require('./Helper')
let _config = require('./Config')
/**
 * Ping - Flag if app is running
 * @param {} data 
 * @param {*} callback as response
 */
handlers.ping = (data, callback)=>{
    callback(200, {'response': 'API is up and running'})
}


/**
 * Not Found - Response for invalid request path
 * @param {} data 
 * @param {*} callback as response
 */
handlers.notFound = (data, callback)=>{
    callback(404)
}


/**
 * Primary User handlers
 * @param {*} data 
 * @param {*} callback 
 */
handlers.users = (data, callback)=>{
    let method  = data.method.toLowerCase()
    let acceptableMethods = ['get','post', 'put', 'delete']
    if( acceptableMethods.indexOf(method) > -1 ){
        handlers._users[method](data, callback)
    }else{
        callback(404)
    }
}

/**
 * Users handlers - Sub methods
 */
handlers._users = {}

/**
 * 
 * @param {firstName, lastName, phone, password, tosAgreement} data  
 * @param {*} callback 
 */
handlers._users.post = (data, callback)=>{
    let firstName    = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    let lastName     = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    let phone        = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password     = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 6 ? data.payload.password.trim() : false
    let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? data.payload.tosAgreement : false

    if(firstName && lastName && phone && password && tosAgreement){
        _fs.read('users', phone, (err)=>{
            if(!err && data){
                callback(422, {'error': 'Phone must be unique. Users\'s phone number already exist. '})
            }else{
                let userData = {
                    'firstName' : firstName,
                    'lastName': lastName,
                    'phone' : phone,
                    'password': _helper.hash(password),
                    'tosAgreement': tosAgreement
                }
                _fs.create('users', phone, userData, (err)=>{
                    if(!err){
                        callback(200, {'success': 'User successfully created.'})
                    }else{
                        callback(500, {'err': err})
                    }
                })
            }
        })
        
    }else{
        callback(406, {'error': 'Missing required parameters.'})
    }    
}


/**
 * GET users informations
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.get = (data, callback)=>{
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false
    if(phone){
        _fs.read('users', phone, (err, data)=>{
            if(!err && data){
                delete data.password
                callback(200, data)
            }else{
                callback(406, {'error': 'User does not exist.'})
            }
        })
    }else{
        callback(406, {'error': 'Missing required parameters.'})
    }
}

/**
 * Update user informations
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.put = (data, callback)=>{
    let firstName    = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    let lastName     = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    let phone        = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password     = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 6 ? data.payload.password.trim() : false

    if(firstName && lastName && phone && password ){
        _fs.read('users', phone, (err)=>{
            if(!err && data){
                let userData = {
                    'firstName' : firstName,
                    'lastName': lastName,
                    'phone' : phone,
                    'password': password,
                }
                _fs.update('users', phone, userData, (err)=>{
                    if(!err){
                        callback(200, {'success': 'User successfully updated.'})
                    }else{
                        callback(500, {'err': err})
                    }
                })

            }else{
                callback(406, {'error': 'Missing required parameters.'})
            }
        })
        
    }else{
        callback(406, {'error': 'Missing required parameters.'})
    }
}


handlers._users.delete = (data, callback)=>{
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
    if(phone){
        let tokenId = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false
        
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(tokenId, phone, (isValidToken)=>{
            if(isValidToken){
                // Lookup the user
                _fs.read('users', phone, (err, userData)=>{
                    if(!err && userData){
                        _fs.delete('users',phone, (err)=>{
                            if(!err){
                                // Delete associated checks of users
                                let userChecks = typeof(userData.checks) =='object' && userData.checks instanceof Array ? userData.checks : []
                                let checksToDelete = userChecks.length
                                if(checksToDelete > 0){
                                    var checksDeleted = 0
                                    var deletionError = false
                                    userChecks.forEach(checkId => {
                                        // Delete the check
                                        _fs.delete('checks', checkId, (err)=>{
                                            if(err){
                                                deletionError = true;
                                            }
                                            checksDeleted++;
                                            if(checksDeleted == checksToDelete){
                                                if(!deletionError){
                                                    callback(200)
                                                }else{
                                                    callback(500, {'error': 'Error encountered while deleting user\'s checks. All checks may not have been deleted to the system.'})
                                                }
                                            }
                                        })
                                    });
                                }else{
                                    callback(200)
                                }
                            }else{
                                callback(500, {'err': err})
                            }
                        })
                    }else{
                        callback(403, {'error': 'User does not exists.'})
                    }
                })
            }else{
                callback(403, {'error': 'Authentication failed'})
            }
        })
    }else{
        callback(402, {'error': 'missing required fields.'})
    }
}

/**
 * Token handlers
 * @param {*} data 
 * @param {*} callback 
 */
handlers.tokens = (data,callback)=>{
   let acceptableMethods = ['get','put','post','delete']
   let method = data.method.toLowerCase()
   if( acceptableMethods.indexOf(method) ){
       handlers._tokens[method](data, callback)
   }else{
       callback(406 , {'error': 'Invalid request method'})
   }
}

/**
 * Tokens method handlers
 */

handlers._tokens = {}
handlers._tokens.post = (data,callback)=>{
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 6 ? data.payload.password.trim() : false
    if(phone && password){
        let hashPassword = _helper.hash(password)
        _fs.read('users', phone, (err, data)=>{
            if(!err && data){
                if(data.password == hashPassword){
                    let tokenId = _helper.createRandomString(20)
                    let expires = Date.now() + 1000 * 60 * 60
                    let tokenObject = {
                        'phone' : phone,
                        'expires': expires,
                        'id': tokenId
                    }

                    // Create token record
                    _fs.create('tokens', tokenId, tokenObject, (err)=>{
                        if(!err){
                            callback(200, {'token': tokenObject})
                        }else{
                            callback(400, {'error': 'Could not generate token'} )
                        }
                    })
                }else{
                    callback(400, {'error': 'Invalid credentials'})
                }
            }else{
                callback('400', {'error': 'Could not find the specific account'})
            }
        })
    }else{
        callback(404)
    }
}

// Token Verify
handlers._tokens.verifyToken = (id, phone, callback)=>{
    _fs.read('tokens', id, (err, data)=>{
        if(!err && data){ 
            if(data.phone == phone){
                if( data.expires > Date.now() ){
                    callback(true)
                }else{
                    callback(false)
                }
            }else{
                callback(false)
            }
        }else{
            callback(false)
        }
    })
}


/**
 * Checks Handlers
 */

handlers.checks = (data, callback)=>{
    let acceptableMethods = ['get','put','post','delete']
    let method = data.method.toLowerCase()
    if( acceptableMethods.indexOf(method) > -1 ){
        handlers._checks[method](data, callback)
    }else{
        callback(406 , {'error': 'Invalid request method'})
    }
}

/**
 * Checks sub method
 */
handlers._checks = {}

handlers._checks.post = (data, callback)=>{
    let acceptedProtocols = ['http', 'https']
    let protocol = (acceptedProtocols.indexOf(data.payload.protocol.toLowerCase()) >-1) ? data.payload.protocol.toLowerCase() : false
    let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false
    let successCodes = data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds > 0 ? data.payload.timeoutSeconds : false
    let method = typeof(data.payload.method) == 'string' && ['get', 'post'].indexOf(data.payload.method.toLowerCase()) >-1 ? data.payload.method.toLowerCase() : false

    if( acceptedProtocols && protocol && url && successCodes && timeoutSeconds && method){
        let tokenId = data.headers.token

        // Check if token data is valid
        _fs.read('tokens', tokenId, (err, data)=>{
            if(!err && data){
                if(data.expires > Date.now()){

                    // Look up User data
                    _fs.read('users', data.phone, (err, userData)=>{
                        if(!err && userData){
                            let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                            // Check if user, does not reach the maximum checks
                            if( userChecks.length < _config.maxChecks ){
                                // Create a random id for check
                                var checkId = _helper.createRandomString(20)

                                // Create the check object, and include the user's phone
                                var checkObject = {
                                    'id': checkId,
                                    'userPhone': data.phone,
                                    'protocol': protocol,
                                    'url': url,
                                    'method': method,
                                    'successCodes': successCodes,
                                    'timeoutSeconds': timeoutSeconds
                                }
                                
                                // Create check record
                                _fs.create('checks', checkId, checkObject, (err)=>{
                                    if(!err){
                                        // Add the check id to the users object
                                        userData.checks = userChecks
                                        userData.checks.push(checkId)

                                        // Save the new user data
                                        _fs.update('users', data.phone, userData, (err)=>{
                                            if(!err){
                                                callback(200, checkObject)
                                            }else{
                                                callback(500, {'error': 'Could not update the user with the new check.'})
                                            }
                                        })
                                    }else{
                                        callback(500, {'error':'Could not create check record.'})
                                    }
                                })

                            }else{
                                callback(400, {'error':'Could not create. User already reach the maximum checks.'})
                            }
                        }else{
                            callback(400, {'error':'Specified user not found.'})
                        }
                    })

                }else{
                    callback(400, {'error': 'session expires'})
                }
                
            }else{
                callback(400, {'error': 'Invalid session.'})
            }
        })

    }else{
        callback(400, {'error': 'missing required fields'})
    }

}

// Checks - get
// Required data : id, tokenId
// Optional data : none
handlers._checks.get = (data, callback)=>{
    // check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if(id){
        // Lookup check
        _fs.read('checks',id,(err,checkData)=>{
            if(!err && checkData){
                let tokenId = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false

                handlers._tokens.verifyToken(tokenId, checkData.userPhone, (isValidToken)=>{
                    if(isValidToken){
                        callback(200, checkData)
                    }else{
                        callback(400, {'error':'Invalid token'})
                    }
                })
            }else{
                callback(400, {'error': 'Check does not exist.'})
            }
        })
    }else{
        callback(400, {'error': 'Missing required parameter.'})
    } 
}

// Checks - PUT
// Required data: id, tokenId
// Optional data: protocol,url, successCodes,timeoutSeconds, method
handlers._checks.put = (data, callback)=>{
    let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
    if(id){
        // Check optional fields
        let protocol = (['http', 'https'].indexOf(data.payload.protocol.toLowerCase()) >-1) ? data.payload.protocol.toLowerCase() : false
        let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false
        let successCodes = data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
        let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds > 0 ? data.payload.timeoutSeconds : false
        let method = typeof(data.payload.method) == 'string' && ['get', 'post'].indexOf(data.payload.method.toLowerCase()) >-1 ? data.payload.method.toLowerCase() : false

        _fs.read('checks',id, (err, checkData)=>{
            if(!err && checkData){
                // Token
                let tokenId = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false
                if(tokenId){
                    // Verify if token is valid
                    handlers._tokens.verifyToken(tokenId, checkData.userPhone, (tokenIsValid)=>{
                        if(tokenIsValid){
                            checkData.protocol = (protocol) ?  protocol : checkData.protocol
                            checkData.url = (url) ?  url : checkData.url
                            checkData.successCodes = (successCodes) ?  successCodes : checkData.successCodes
                            checkData.timeoutSeconds = (timeoutSeconds) ?  timeoutSeconds : checkData.timeoutSeconds
                            checkData.method = (method) ?  method : checkData.method

                            // Update the checkdata
                            _fs.update('checks',id,checkData,(err)=>{
                                if(!err){
                                    callback(200, checkData)
                                }else{
                                    callback(500, {'error': 'Error on updating check data.'})
                                }
                            })

                        }else{
                            callback(400, {'error': 'Token Authentication failed.'})
                        }
                    })
                }else{
                    callback(400, {'error': 'Missing required token authentication.'})
                }
            }else{
                callback(400, {'error': 'Check could not found.'})
            }
        })
    
    }else{
        callback(400, {'error': 'Missing required fields'})
    }
}


// Check - DELETE
// Required data: id, tokenId
// Optional data: none

handlers._checks.delete = (data, callback)=>{
    let checkId = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
    if(checkId){
        let tokenId = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false
        _fs.read('checks', checkId, (err, checkData)=>{
            if(!err && checkData){
                handlers._tokens.verifyToken(tokenId, checkData.userPhone, (isVerifiedToken)=>{
                    if(isVerifiedToken){
                        // Delete the check
                        _fs.delete('checks', checkId, (err)=>{
                            if(!err){
                                // Update user checks record
                                _fs.read('users', checkData.userPhone, (err, userData)=>{
                                    if(!err){
                                        let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                        
                                        var checkPosition = userChecks.indexOf(checkId)
                                        if(checkPosition > -1){
                                            userChecks.splice(checkPosition, 1)
                                            _fs.update('users', checkData.userPhone, userData, (err)=>{
                                                if(!err){
                                                    callback(200, {'success': userData})
                                                }else{
                                                    callback(400, err)
                                                }
                                            })
                                        }else{
                                            callback(500, {"error": 'Could not find the check on user\'s object.'})
                                        }
                                        
                

                                    }else{
                                        callback(500, {'error': 'could not load user data. User\'s check record could not update'})
                                    }
                                })
                            }
                        })
                    }else{
                        callback(400, {'error': checkData})
                    }
                })
            }else{
                callback(400, {'error': 'Could not found the specified check.'})
            }
        })
    }else{
        callback(400, {'error': 'Missing requred fields.'})
    }
}


// Export the module
module.exports = handlers