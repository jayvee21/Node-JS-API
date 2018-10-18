/**
 * 
 * Library for storing and rotating logs
 * 
 */

let logs = {}

// Node dependencies
let fs = require('fs')
let path = require('path')

// Set default logs directory
logs.baseDir = path.join(__dirname,('./../.logs/'))

// Appending logs
logs.append = (file, logData, callback)=>{
    // Check if log already exist
    fs.open(logs.baseDir + file + '.json', 'a', (err, fileDescriptor)=>{
        if(!err && fileDescriptor){
            // append the file and close it
            fs.appendFile(fileDescriptor, logData + '\n', (err)=>{
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false)
                        }else{
                            callback('Error closing file that was being appended.')
                        }
                    })
                }else{
                    callback('error on appending to file')
                }
            })
        }else{
            callback('could not open open file for appending')
        }
    })
}




// Export module
module.exports = logs