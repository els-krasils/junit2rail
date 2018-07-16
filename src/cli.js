'use strict'

let Core = require('./core.js')

module.exports = function testrailCliFactory(argv, process) {
    process = process || global.process
    let url      = process.env.TESTRAIL_URL || argv.url
    let username = process.env.TESTRAIL_UN  || argv.username
    let password = process.env.TESTRAIL_PW  || argv.password

    // Ensure we have a URL, username, and password to work with.
    if (!url || !username || !password) {
        console.error('Couldn\'t find testrail API credentials.')
        console.error('URL:      Either TESTRAIL_URL env variable or --url flag.')
        console.error('Username: Either TESTRAIL_UN env variable or --username flag.')
        console.error('Password: Either TESTRAIL_PW env variable or --password flag.')
        process.exit(1)
    }

    let configs = {}

    // Global configs to pull in.
    configs.testRailUrl      = url
    configs.testRailUser     = username
    configs.testRailPassword = password
    configs.debugMode        = argv.debug || false

    // Instantiate the core.
    let core = new Core(configs)

    return {
        report: async () => {
            let reportConfigs = {}
            let skipStatus = parseInt(argv.skipStatus)
            reportConfigs.runId       = argv.runId      || argv.r
            reportConfigs.planId      = argv.planId     || argv.p
            reportConfigs.reportsPath = argv.file       || argv.f
            reportConfigs.skipStatus  = isNaN(skipStatus) ? 0 : skipStatus
            reportConfigs.logCoverage = argv.coverage   || false
            if (!reportConfigs.reportsPath || (reportConfigs.runId === undefined && reportConfigs.planId === undefined)) {
                console.error('You must supply a file (-f or --file=) and either runId (-r or --runId=) or planId (-p or --planId=).')
                debug('files: "' + reportConfigs.reportsPath + '", runId: "' + reportConfigs.runId + '", planId: "' + reportConfigs.planId + '"')
                process.exit(1)
            }

            await core.report(reportConfigs)
        }
    }
}
