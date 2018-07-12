'use strict'
let TestRailClient = require('node-testrail')

function TestRailManager({testRailUrl, testRailUser, testRailPassword, debug}) {

    // Authenticate and create the TestRail client.
    let testRailClient = new TestRailClient(testRailUrl, testRailUser, testRailPassword)
    let planIdProvided = false
    let defaultRunId = 0
    let caseTestRuns = {}

    // TestRail lib methods promisified

    function addResultsForCases(runId, testResults) {
        return new Promise(fulfill => {
            testRailClient.addResultsForCases(runId, {results: testResults}, function (response) {
                response = typeof response === 'string' ? JSON.parse(response) : response
                fulfill(response)
            })
        })
    }

    function getPlan(planId) {
        return new Promise(fulfill => {
            testRailClient.getPlan(planId, function (response) {
                response = typeof response === 'string' ? JSON.parse(response) : response
                fulfill(response)
            })
        })
    }

    function getTests(runId) {
        return new Promise(fulfill => {
            testRailClient.getTests(runId, function (response) {
                response = typeof response === 'string' ? JSON.parse(response) : response
                fulfill(response)
            })
        })
    }

    // actual lib methods

    this.setup = async ({runId, planId}) => {
        defaultRunId = runId
        if (planId === undefined) {
            return
        }
        planIdProvided = true
        let plan = await getPlan(planId)
        if (!Array.isArray(plan.entries)) {
            throw new Error('Couldn\'t get info about plan #' + planId + ': ' + JSON.stringify(plan, undefined, 4).substr(0, 1000))
        }
        for (let entry of plan.entries) {
            if (!Array.isArray(entry.runs)) {
                throw new Error('Couldn\'t get info about plan #' + planId + ' suite #' + entry.suite_id + ' entry: ' + JSON.stringify(entry, undefined, 4).substr(0, 1000))
            }
            for (let run of entry.runs) {
                let tests = await getTests(run.id)
                if (!Array.isArray(tests)) {
                    throw new Error('Couldn\'t get info about test run #' + run.id + ': ' + JSON.stringify(tests, undefined, 4).substr(0, 1000))
                }
                for (let test of tests) {
                    if (caseTestRuns[test.case_id] === undefined) {
                        caseTestRuns[test.case_id] = []
                    }
                    caseTestRuns[test.case_id].push(run.id)
                }
            }
        }
        debug(caseTestRuns)
    }

    this.resolveTestRunsFromCasId = caseId => {
        if (planIdProvided) {
            let testRuns = caseTestRuns[caseId]
            if (testRuns === undefined) {
                testRuns = []
            }
            return testRuns
        } else {
            return [defaultRunId]
        }
    }

    async function sendReportAttempt({runId, testResults, attemptsLeft}) {
        debug('Attempting to send case results to TestRail')

        let response = await addResultsForCases(runId, testResults)

        debug('Received response from TestRail.')

        if (response instanceof Array && response.length) {
            console.log('Successfully uploaded ' + response.length + ' test case results to TestRail.')
            debug(response)
        }
        else {
            if (attemptsLeft > 0) {
                attemptsLeft -= 1
                debug('Failed to upload case runs. Attempts left: #' + attemptsLeft)
                await sendReportAttempt({runId, testResults, attemptsLeft})
            }
            else {
                debug(response)
                debug(testResults)
                throw new Error('There was an error uploading test results to TestRail: ' + response.error)
            }
        }
    }

    this.sendReport = async ({runId, testResults, attempts}) => {
        await sendReportAttempt({runId, testResults, attemptsLeft: attempts})
    }
}

module.exports = TestRailManager