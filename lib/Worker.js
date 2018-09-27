/**
 * Worker for some various checks
 */

// Declare the worker object
let workers = {}

// Dependencies
let url = require('url')
let http = require('http')
let https = require('https')

// Lib dependency
let _data = require('./FileSystem')

// Gather all checks
workers.gatherAllChecks = ()=>{
    // List all checks
    _data.list('checks', (err, checks)=>{
        if( !err && checks && checks.length > 0 ){
            // Loop thru each checks
            checks.forEach(check => {
                // Read in the check data
                _data.read( 'checks', check, (err, checkData)=>{
                    if(!err && checkData){
                        // pass it to the check validator, and let the function continue
                        workers.validateCheckData(checkData)
                    }else{
                        console.log("Error reading one of the check's data")
                    }
                })
            });
        }else{
            console.log("Error: Could not find checks to process")
        }
    })
}

workers.validateCheckData = (originalCheckData)=>{
    
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : false
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.length == 20 ? originalCheckData.id : false
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.length == 10 ? originalCheckData.userPhone : false
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.length > 1 ? originalCheckData.url : false
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get','post','delete','put'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array ? originalCheckData.successCodes : false
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0
                                        && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5
                                        ? originalCheckData.timeoutSeconds : false

    // Set the keys that may not be set ( if the workers have never seen this check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' &&  originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false

    if( originalCheckData && originalCheckData.id && originalCheckData.userPhone 
        && originalCheckData.protocol && originalCheckData.url
        && originalCheckData.method && originalCheckData.successCodes 
        && originalCheckData.timeoutSeconds
        ){
        workers.performCheck(originalCheckData)
    }else{
        console.log("Error file data")
    }
}

// Performs the check, send the original check data and the outcome of the chekc process, to the next step of the process
workers.performCheck = (originalCheckData)=>{
    // Prepare the initial check outcome
    let checkOutcome = {
        'error': false,
        'responseCode': false
    }

    // Mark the outcome has not been sent yet
    let outcomeSent = false
    
    // Parse the hostname and the path out of the original check data
    let parsedUrl = url.parse(originalCheckData.protocol + '://'+originalCheckData.url, true);
    let hostName = parsedUrl.hostname 
    let path = parsedUrl.path // using path and not "pathname" because we want to get also the query


    // Construct the request
    let requestDetails = {
        'protocol': originalCheckData.protocol + ":",
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeout
    }


    // Instantiate the request object using the HTTP or HTTPS module
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https
    let req = _moduleToUse.request(requestDetails, (res)=>{
        // Grab the status of the sent request
        let status = res.statusCode;
        // Update the checkOutcome and pass the data along
        checkOutcome.responseCode = status
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // Bind to the error event so it doesnt get thrown
    req.on('error', function(e){
        checkOutcome.error = {
            'error': true,
            'value': e
        }
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true;
        }
    })
}

// Process the check outcome, update the check data as needed, trigger an alert the user if needed
// Special logic for accomodating a check that has never been tested before (Don't alert on that one)

workers.processCheckOutcome = function (originalCheckData, checkOutcome){
    // Decide if the check is considered up or down
    let state = !checkOutcome.error 
                && checkOutcome.responseCode 
                && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'
                
    // Decide if an alert is warranted
    var allertWanted = originalCheckData.lastChecked && originalCheckData.state !== state? true : false

    // Update the check data
    let newCheckData = originalCheckData
    newCheckData.state = state
    newCheckData.lastChecked = Date.now()

    // Save the updates
    _data.update('checks', newCheckData.id, newCheckData, function(err){
        if(!err){
            // Send new 
        }else{
            console.log('Error on trying to save updates to one of the checks')
        }
    })
}





// Timer to execute the worker-process once per minute
workers.loop = ()=>{
    setInterval( ()=>{
        workers.gatherAllChecks()
    }, 60 * 1000 ) 
}




workers.init = ()=>{
    // Process checks on start
    workers.gatherAllChecks()

    // Loop thru checking process
    workers.loop()
}



// Export module
module.exports = workers