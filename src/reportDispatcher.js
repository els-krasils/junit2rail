'use strict'

function ReportDispatcher({debug, skipStatus}) {
    this.dispatch = ({caseRuns, resolveCaseIdsFromCaseRun, resolveTestRunsFromCasId}) => {

        // firstly group case runs by TestRail case id; one case run may relate to multiple TestRail cases
        let caseResults = {}
        for (let caseRun of caseRuns) {
            let caseRunResult = {
                testName   : caseRun.testName,
                railCaseIds: resolveCaseIdsFromCaseRun(caseRun.testClass, caseRun.testName),
                elapsed    : caseRun.time,
                statusId   : undefined,
                comment    : ''
            }

            if (caseRun.failures.length > 0) {
                // If test case failure elements exist, there was a failure. 5 means failure. Add failure messages
                caseRunResult.statusId = 5
                caseRunResult.comment += caseRun.failures.join('\n')
            } else if (caseRun.skipped.length > 0) {
                caseRunResult.statusId = skipStatus
                caseRunResult.comment += caseRun.skipped.join('\n')
            } else {
                // Otherwise, the test case passed. 1 means pass.
                caseRunResult.statusId = 1
            }

            if (caseRunResult.statusId !== undefined) {
                debug('Result: ' + JSON.stringify(caseRunResult, undefined, 4))
                debug('Appending result to cases: ' + caseRunResult.railCaseIds)
                for (let caseId of caseRunResult.railCaseIds)  {
                    if (caseResults[caseId] === undefined) {
                        caseResults[caseId] = []
                    }
                    caseResults[caseId].push(caseRunResult)
                }
            }
        }

        // then for every found TestRail case summarize results and group by TestRail test run id
        let planResults = {}
        for (let caseId of Object.keys(caseResults)) {
            debug('caseId = ' + caseId)
            let caseSummary = {
                case_id: caseId,
                status_id: 1,
                elapsed: 0,
                comment: ''
            }
            for (let runResult of caseResults[caseId]) {
                debug('runResult: ' + JSON.stringify(runResult, undefined, 4))
                caseSummary.elapsed += runResult.elapsed
                if (runResult.statusId > caseSummary.status_id) {
                    caseSummary.status_id = runResult.statusId
                }
                if (runResult.comment !== '') {
                    caseSummary.comment += runResult.testName + ' (status ' + runResult.statusId + '): ' + runResult.comment + '\n'
                }
            }
            if (caseSummary.elapsed === 0) {
                caseSummary.elapsed = 1
            }
            caseSummary.elapsed = '' + caseSummary.elapsed + 's'
            debug('caseSummary.elapsed = ' + caseSummary.elapsed)

            let testRuns = resolveTestRunsFromCasId(caseId)
            debug('testRuns:')
            debug(testRuns)
            if (testRuns.length === 1) {
                let runId = testRuns[0]
                if (planResults[runId] === undefined) {
                    planResults[runId] = []
                }
                planResults[runId].push(caseSummary)
            } else {
                let testRunsStr = ''
                if (testRuns.length > 0) {
                    testRunsStr = '(' + testRuns + ') '
                }
                console.log('Case #' + caseId + ' is mentioned in ' + testRuns.length + ' TestRail test runs ' + testRunsStr + 'and thus its result is not reported')
            }
        }

        return planResults
    }
}

module.exports = ReportDispatcher