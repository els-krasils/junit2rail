'use strict'

let JUnitReportsManager = require('./jUnitReports')
let CaseRunMapManager   = require('./caseRunMap')
let TestRailManager     = require('./testRail')
let ReportDispatcher    = require('./reportDispatcher')

/**
 * Instantiates a "core" object with given dependencies. The object consists of
 * properties that represent methods to be run on corresponding commands.
 *
 * @param {object} configs
 * @returns {{report: Function}}
 */
function Core({testRailUrl, testRailUser, testRailPassword, debugMode}) {
    let debug = function (message) {
        if (debugMode) {
            if (typeof  message === 'object') {
                message = JSON.stringify(message, undefined, 4)
            }
            console.error(message)
        }
    }

    /**
     * Given a junit XML file (or a directory of files), processes all test
     * results, maps them to cases, and pushes the results to testRailClient.
     *
     * @param {int} runId
     *   The ID of the run with which to associate the cases.
     * @param {int} planId
     *   The ID of the test plan which should be analyzed to associate results with single case runs.
     * @param {string} reportsPath
     *   The path to the junit XML file or directory of files.
     * @param {boolean} logCoverage
     *   whether to log coverage info into console
     * @param {number} knownIssueStatus
     *   TestRail custom status code for known issues (defects will be reported)
     */
    this.report = async function({runId, planId, reportsPath, logCoverage, knownIssueStatus}) {

        debug('Attempting to report runs for test cases.')

        debug('>>>>>>>>>> testrail map:')
        let testRailManager = new TestRailManager({testRailUrl, testRailUser, testRailPassword, debug})
        await testRailManager.setup({runId, planId})

        let caseRunMapManager = new CaseRunMapManager({debug})
        // TODO path should be configurable
        caseRunMapManager.loadMapFromFile('./.testrail-cli.json')
        debug('>>>>>>>>>> caseRunMap:')
        debug(JSON.stringify(caseRunMapManager.getMap(), undefined, 4))

        debug('>>>>>>>>>> jUnit report:')
        let jUnitReportsManager = new JUnitReportsManager({debug})
        let caseRuns = jUnitReportsManager.loadCasesFromReportsPath(reportsPath)

        debug('>>>>>>>>>> dispatch:')
        let reportDispatcher = new ReportDispatcher({debug, knownIssueStatus})
        let planResults = reportDispatcher.dispatch({
            caseRuns,
            resolveCaseIdsFromCaseRun: caseRunMapManager.resolveCaseIdsFromCaseRun,
            resolveTestRunsFromCasId : testRailManager  .resolveTestRunsFromCasId,
        })

        if (logCoverage) {
            caseRunMapManager.logCoverage()
        }

        // Post results if we had any.
        if (Object.keys(planResults).length > 0) {
            for (let runId of Object.keys(planResults)) {
                let testResults = planResults[runId]
                await testRailManager.sendReport({runId, testResults, attempts: 3})
            }
        }
        else {
            console.log('Could not map any result')
        }
    }
}

module.exports = Core