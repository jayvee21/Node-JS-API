/**
 * Helper for some related tasks
 */

let helper = {}

/**
 * Node module dependency
 */

let crypto = require('crypto')
let https = require('https')
let querystring = require('querystring')
// Library dependency

let _config = require('./Config')

/**
 * Convert string to JSON (vice versa)
 */

helper.strToJson = (str)=>{
    try{
        return JSON.parse(str)
    }catch(e){
        return false
    }
}

helper.jsonToString = (str)=>{
    try{
        return JSON.stringify(str)
    }catch(e){
        return false
    }
}

// Hashing password
helper.hash = (password)=>{
    const hash = crypto.createHmac('sha256', _config.secret)
                 .update(password)
                 .digest('hex');
    return hash;
}

// Create random string

helper.createRandomString = (strLength)=>{
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false
    if( strLength ){
        let posibleChars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        var str = ''
        for(i = 1; i <= strLength; i ++){
            let randomChar = posibleChars.charAt(Math.floor( Math.random() * posibleChars.length ))
            str += randomChar
        }
        return str
    }else{
        return false
    }
}


// Export module
module.exports = helper