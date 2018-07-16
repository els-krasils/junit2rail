'use strict'
let YAML = require('yamljs')
let fs = require('fs')
let path  = require('path')

function CaseRunMapManager({debug}) {

    let caseMapRunToRail = {caseNameToIdMap: {}, caseClassAndNameToIdMap: {}}

    let coverage = { // a collection of case and suit names, used by resolveCaseIdFromTestCase method, for coverage analysis
        caseNameUsed: {},
        caseClassAndNameUsed: {}
    }

    this.getMap = () => {
        return caseMapRunToRail
    }

    /**
     * Helper method to map a testcase (xUnit) to a testRailClient caseId. Uses caseMapRunToRail
     *
     * @param {String} testClass - The class associated with test case.
     * @param {String} testName - The name of the test run.
     *
     * @return {int[]}
     *   Returns caseIds or empty array on failure to match.
     */
    this.resolveCaseIdsFromCaseRun = (testClass, testName) => {
        let railCaseIds = undefined

        debug(testName)

        //First try to find case id in case name; it should be enclosed in square brackets with a number sign attached at left side
        if (testName.match(/#\[\d{1,6}]/) !== null) {
            railCaseIds = [testName.match(/#\[\d{1,6}]/)[0].match(/\d{1,6}/)[0]]
        }

        // Then check if there's a matching caseClassAndNameToIdMap class.
        if (railCaseIds === undefined && caseMapRunToRail.caseClassAndNameToIdMap && caseMapRunToRail.caseClassAndNameToIdMap[testClass]) {
            // If there's a matching name nested underneath the class, return it.
            if (caseMapRunToRail.caseClassAndNameToIdMap[testClass][testName]) {
                if (coverage.caseClassAndNameUsed[testClass] === undefined) {
                    coverage.caseClassAndNameUsed[testClass] = {}
                }
                coverage.caseClassAndNameUsed[testClass][testName] = true
                railCaseIds = caseMapRunToRail.caseClassAndNameToIdMap[testClass][testName]
            }
        }

        // Then check if there's a matching caseNameToIdMap name.
        if (railCaseIds === undefined && caseMapRunToRail.caseNameToIdMap && caseMapRunToRail.caseNameToIdMap[testName]) {
            coverage.caseNameUsed[testName] = true
            railCaseIds = caseMapRunToRail.caseNameToIdMap[testName]
        }

        if (railCaseIds === undefined) {
            railCaseIds = []
        }

        if (!Array.isArray(railCaseIds)) {
            railCaseIds = [railCaseIds]
        }

        return railCaseIds
    }

    this.logCoverage = () => {
        for (let caseName of Object.keys(caseMapRunToRail.caseNameToIdMap)) {
            if (coverage.caseNameUsed[caseName] === undefined) {
                console.log('Case "' + caseName + '" mapping to ' + caseMapRunToRail.caseNameToIdMap[caseName] + ' has not been used')
            }
        }
        for (let caseClass of Object.keys(caseMapRunToRail.caseClassAndNameToIdMap)) {
            if (coverage.caseClassAndNameUsed[caseClass] === undefined) {
                console.log('Class "' + caseClass + '" mapping has not been used at all')
                continue
            }
            for (let caseName of Object.keys(caseMapRunToRail.caseClassAndNameToIdMap[caseClass])) {
                if (coverage.caseNameUsed[caseName] === undefined) {
                    console.log('Class "' + caseClass + '" and case "' + caseName + '" mapping to ' + caseMapRunToRail.caseClassAndNameToIdMap[caseClass][caseName] + ' has not been used')
                }
            }
        }
    }

    this.loadMapFromFile = filePath => {
        let ext = path.extname(filePath)
        switch (ext) {
            case '.yml':
                caseMapRunToRail = YAML.load(filePath)
                break
            case '.json':
                caseMapRunToRail = JSON.parse(fs.readFileSync(filePath, 'utf8'))
                break
            default:
                throw new Error('Map parsing for ' + ext + ' is not implemented yet')
        }
    }
}

module.exports = CaseRunMapManager