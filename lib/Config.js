/**
 * Primary application configurations
 */

let env = {}


/**
 * Staging environment configurations
 */
env.staging = {
    'port': 3000,
    'envName': 'staging',
    'secret': 'secretKeyForStaging',
    'maxChecks': 5,
    'twilio':{
        'accountSid': 'AC388f4aad944604f2e7d1154604961c26',
        'authToken': '24eee1bfa1253d3a5cdb235e05966203',
        'fromPhone': '+14322781641'
    }
}

/**
 * Production environment configurations
 */
env.production = {
    'port': 80,
    'envName': 'production',
    'secret': 'secretKeyForProduction',
    'maxChecks': 5,
    'twilio':{
        'accountSid': 'AC388f4aad944604f2e7d1154604961c26',
        'authToken': '24eee1bfa1253d3a5cdb235e05966203',
        'fromPhone': '+14322781641'
    }
}

/**
 * Current environment
 */
let currEnv = typeof( process.env.NODE_ENV ) != 'undefined' ? process.env.currEnv : ''

/**
 * Evnironment to export
 */

let envToExport = typeof( env[currEnv] ) != 'undefined' ? env[currEnv] : env.staging

// Export environment
module.exports = envToExport


