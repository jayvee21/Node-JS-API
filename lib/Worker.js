/**
 * Worker for some various checks
 */

let _data = require('./FileSystem')
let _helpers = require('./Helper')
let _logs = require('./Logs')

let url = require('url')
let http = require('http')
let https = require('https')

// Declare the worker object
let workers = {}

// Look up all checks, gather their data and send to a validator
workers.gatherAllChecks = function(){
    _data.list('checks',(err, checks )=>{
        if(!err && checks && checks.length > 0){
            checks.forEach(check => {
                // Read in the check data
                _data.read('checks', check, (err, originalCheckData)=>{
                    if(!err && originalCheckData){
                        // Original check data to the validator
                        workers.validateCheckData(originalCheckData)
                    }else{
                        console.log('Error on reading check', check)
                    }
                })
            });
        }else{
            console.log("No checks to process")
        }
    })
}

// Validate check data
workers.validateCheckData = (originalCheckData)=>{
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : false
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id : false 
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone : false
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url : false
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get','post','delete','put'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array ? originalCheckData.successCodes : false
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds > 0  && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false

    if(originalCheckData && originalCheckData.id 
        && originalCheckData.userPhone && originalCheckData.protocol
        && originalCheckData.url && originalCheckData.method
        && originalCheckData.successCodes && originalCheckData.timeoutSeconds ){
        
        // Perform check
        workers.performCheck(originalCheckData)
        
    }else{
        console.log("Error: One of the checks is not properly formatted. Skipping it.")
    }
}

// Perform check, send the originalCheckData and the outcome of the check process, to the next step
workers.performCheck = (originalCheckData)=>{
    // Prepare the initial check outcome
    var checkOutcome = {
        'error': false,
        'response': false
    }

    // Mark the outcome has not been sent yet
    var outcomeSent = false

    // Parse the hostname and the path out of the original check data
    var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true)
    var hostName = parsedUrl.hostname
    var path = parsedUrl.path // using path and not "pathname" because we want the query string

    // Construct the request
    let requestDetails = {
        'protocol': originalCheckData.protocol + ":",
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeout
    }

    var _moduleToUse = typeof(originalCheckData.protocol) == 'http' ? http : https

    // Initialize the request
    var req = _moduleToUse.request(requestDetails, (res)=>{
        // Grab the status of the sent request
        let status = res.statusCode

        // Update the checkOutCome and pass the data along
        checkOutcome.responseCode = status

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // Bind to the error event so it doesn't get thrown
    req.on('error', (e)=>{
        // Update the checkoutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': e
        }

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // Bind to the timeout event
    req.on('timeout', function(e){
        // Update the checkoutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        }

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // End the request
    req.end()
}

/**
 * Logs the execution
 */
workers.log = (originalCheckData, checkOutCome, state, alertWarranted, timeOfCheck)=>{
    // Form the log data
    let logData = {
        'check': originalCheckData,
        'outcome': checkOutCome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    }

    // Convert the json to a string
    let logString = JSON.stringify(logData)
    // Determine the name of the log file
    let logFileName = originalCheckData.id

    // Append the log string to the file
 
    _logs.append(logFileName, logString, (err) =>{
        if(!err){
            console.log("Logging to file succeeded.")
        }else{
            console.log("Logging to file failed.")
        }
    })
}

// Process the check outcome, update the check data as needed, trigger an alert to the user if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = (originalCheckData, checkOutcome)=>{
    // Decide if the check is considered up or down
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'
    // Decide if an alert is warranted
    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false

    // Update the check data
    let newCheckData = originalCheckData
    newCheckData.state = state
    newCheckData.lastChecked = Date.now()

    // Save the updates
    _data.update('checks', newCheckData.id, newCheckData, (err)=>{
        if(!err){
            // Send new check data to the next phase in the process if needeed
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData)
            }else{
                console.log('Check outcome has not change, no alert needed')
            }
        }else{
            console.log('Error on trying to save updates to one of the checks')
        }
    })


    // Log the checking
    let timeOfCheck = Date.now()
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck)
}

workers.alertUserToStatusChange  = (newCheckData)=>{
    // var msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol +'://'+newCheckData.url + ' is currently ' + newCheckData.state
    // _helpers.sendTwillioSms(newCheckData.userPhone, msg, function(err){
    //     if(!err){
    //         console.log("Success: User was alerted to a status change in their check, via sms", msg)
    //     }else{
    //         console.log("Error: Could not send an sms alert to user who had a state change in their check")
    //     }
    // })
}

// Timer to execute the worker-process once per minute
workers.loop = ()=>{
    setInterval( function(){
        workers.gatherAllChecks()
    }, 1000 * 60)
}


workers.init = ()=>{
    // Gather all checks
    workers.gatherAllChecks()
    // Call the lop so the checks will execute later on
    workers.loop()

}


// Export module
module.exports = workers