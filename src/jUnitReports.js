'use strict'
let XmlParser = require('xml-js')
let fs = require('fs')
let HtmlEntitiesFactory = require('html-entities').AllHtmlEntities
let HtmlEntities = new HtmlEntitiesFactory()

function JUnitReportsManager({debug}) {
    function parseReportBranch(reportBranch, cases) {
        if (reportBranch.elements === undefined) {
            return
        }
        for (let reportElement of reportBranch.elements) {
            // If the root represents a single testsuite, treat it as such.
            if (reportElement.name === 'testsuite') {
                let testSuiteElement = reportElement
                if (!Array.isArray(testSuiteElement.elements)) {
                    continue
                }
                for (let testCaseElement of testSuiteElement.elements) {
                    if (testCaseElement.name !== 'testcase') {
                        continue
                    }
                    debug(testCaseElement)
                    let testTime = parseInt(testCaseElement.attributes.time)
                    let failures = []
                    let skipped = []
                    if (Array.isArray(testCaseElement.elements)) {
                        failures = testCaseElement.elements
                            .filter(testCaseResultElement => {
                                return testCaseResultElement.name === 'failure'
                            })
                            .map(failureElement => {
                                let message = ''
                                if (failureElement.attributes && failureElement.attributes.message) {
                                    message += '  ' +  HtmlEntities.decode(failureElement.attributes.message) + '\n'
                                }
                                if (Array.isArray(failureElement.elements)) {
                                    message += failureElement.elements
                                        .filter(failureElementChild => {
                                            return failureElementChild.type === 'cdata'
                                        })
                                        .map(cDataElement => {
                                            return HtmlEntities.decode(cDataElement.cdata).replace(/\n/g, '\n  ')
                                        })
                                        .join('\n')
                                }
                                return message
                            })
                        skipped = testCaseElement.elements
                            .filter(testCaseResultElement => {
                                return testCaseResultElement.name === 'skipped'
                            })
                            .map(skippedElement => {
                                let message = ''
                                if (skippedElement.attributes && skippedElement.attributes.message) {
                                    message += '  ' +  HtmlEntities.decode(skippedElement.attributes.message) + '\n'
                                }
                                return message
                            })
                    }
                    cases.push({
                        testClass: HtmlEntities.decode(testCaseElement.attributes.classname),
                        testName : HtmlEntities.decode(testCaseElement.attributes.name),
                        time     : (isNaN(testTime) ? 0 : testTime),
                        failures : failures,
                        skipped  : skipped,
                    })
                }
            }
            // If the root consists of multiple test suites, recurse.
            else if (reportElement.name === "testsuites") {
                parseReportBranch(reportElement, cases)
            }
            // If we map to neither of the above expectations, abort.
            else {
                debug(reportElement)
                throw new Error('Invalid xml. Expected element name "testsuite" or "testsuites", but the name is ' + reportElement.name)
            }
        }
    }

    this.loadCasesFromReportsPath = (reportsPath) => {
        let files = []
        let fsStat = fs.statSync(reportsPath)

        if (fsStat.isFile()) {
            // Make sure the provided file is an XML file.
            if (reportsPath.substring(reportsPath.length - 4) === '.xml') {
                files.push(reportsPath)
            }
        }
        else if (fsStat.isDirectory()) {
            files = fs.readdirSync(reportsPath)
                // Filter down to just those files that are XML.
                .filter(dirContent => {
                    return dirContent.substring(dirContent.length - 4) === '.xml'
                })
                .map(dirContent => {
                    return reportsPath + (reportsPath.substring(reportsPath.length - 1) === '/' ? '' : '/') + dirContent
                })
        }

        let cases = []
        for (let filePath of files) {
            let rawXml = fs.readFileSync(filePath, 'utf8')
            let report = XmlParser.xml2js(rawXml)
            parseReportBranch(report, cases)
        }

        return cases
    }
}

module.exports = JUnitReportsManager