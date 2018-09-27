/**
 * Primary file for CRUD data
 * 
 */

let _file = {}

/**
 * Node module depeendencies
 */
let fs = require('fs')
let path = require('path')

/**
 * Lib dependencies
 */
let _helper = require('./Helper')


// Base directory
_file.baseDirectory = path.join(__dirname, './../.data/')

/**
 * Creating new ffile
 * @param {*} dir 
 * @param {*} fileName 
 * @param {json} data 
 * @param {*} callback 
 */
_file.create = (dir, fileName, data, callback)=>{
   fs.open(_file.baseDirectory + dir + '/' + fileName + '.json', 'w+', (err, fileDescriptor)=>{
        if(!err && fileDescriptor){
            let strData = _helper.jsonToString(data)
            fs.writeFile(fileDescriptor, strData, (err)=>{
                if(!err){
                    fs.close(fileDescriptor,(err)=>{
                        if(!err){
                            callback(false)
                        }else{
                            callback(err)
                        }
                    })
                }else{
                    callback(err)
                }
            })
        }else{
            callback(err)
        }
   })
}

/**
 * Reading file
 * @param { directory } dir 
 * @param {*} fileName 
 * @param {*} callback 
 */
_file.read = (dir, fileName, callback)=>{
    fs.readFile(_file.baseDirectory + dir + '/' + fileName + '.json', (err, data)=>{
        if(!err && data){
            let readData  = _helper.strToJson(data)
            callback(err, readData)
        }else{
            callback(err)
        }
    })
}

/**
 * Updating File
 * @param {*} dir 
 * @param {*} fileName 
 * @param {json} newData 
 * @param {*} callback 
 */
_file.update = (dir, fileName, newData, callback)=>{
    fs.open(_file.baseDirectory + dir + '/' + fileName + '.json', 'r+', (err, fileDescriptor)=>{
        if(!err && fileDescriptor){
            fs.truncate( fileDescriptor, (err)=>{
                if(!err) {
                    let strData = _helper.jsonToString(newData)
                    fs.writeFile(fileDescriptor, strData, (err)=>{
                        if(!err){
                            fs.close(fileDescriptor, (err)=>{
                                if(!err){
                                    callback(false)
                                }else{
                                    callback(err)
                                }
                            })
                        }else{
                            callback(err)
                        }
                    })
                }else{
                    callback(err)
                }
            })
        }else{
            callback(err)
        }
    })
}

/**
 * Delete file
 * @param {*} dir 
 * @param {*} fileName 
 * @param {*} callback 
 */
_file.delete = (dir, fileName, callback)=>{
    fs.unlink(_file.baseDirectory + dir + '/' + fileName + '.json', (err)=>{
        if(!err){
            callback(false)
        }else{
            callback(err)
        }
    })
}

/**
 * Lists all the items in a directory
 * @param {*} dir 
 * @param {*} callback 
 */
_file.list = (dir, callback)=>{
    fs.readdir(_file.baseDirectory + dir + '/', (err, data)=>{
        if(!err && data && data.length > 0){
            var trimmedFileNames = []
            data.forEach(function(fileName){
                trimmedFileNames.push(fileName.replace('.json',''))
            })
            callback(false, trimmedFileNames)
        }else{
            callback(err, data)
        }
    })
}

/**
 * Export module
 */
module.exports = _file