# JUnit to TestRail report sender

This is a CLI script intended to send JUnit XML reports to TestRail. The features are:
 - CDATA is properly sent as result message
 - many-to-many relation between implemented test cases and TestRail cases is supported
 - sending results to TestRail test plan is supported

Example
```bash
export TESTRAIL_URL=https://my.super.testrail.net/
export TESTRAIL_UN=autotest@my.super.com
export TESTRAIL_PW=Bow wow chicka bow wow chicka chicka chicka, bow wow chicka bow wow chicka chicka
node ../node_modules/junit2rail report --planId=${TESTRAIL_PLAN_ID} --file=reports --coverage --skipStatus=6
```

Some usage clues:
 - currently the only command is `report`
 - TestRail case ids are resolved via case run name (should have case id in square brackets after # sign, like #[1234]) and "name-to-ids-array" map file;
   currently file path can be either './.testrail-cli.yml' or './.testrail-cli.json' with structure like this:
```javascript
{
    "caseNameToIdMap": {
        "Some case run with unique name #1": "78878",
        "Some case run with unique name #2, affecting 2 TestRail cases": [
            "78845",
            "78878"
        ]
    },
    "caseClassAndNameToIdMap": {
        "Some test class": {
            "Some case run with not so unique name #1": "78878",
            "Some case run with not so unique name #2, affecting 2 TestRail cases": [
                "78845",
                "78878"
            ]
        }
    }
}
```
 - report XML file path is configured by -f or --file CLI parameter, it can be either single file path or directory, where .xml files are searched for only at first level
 - TestRail credentials are set by environment variables TESTRAIL_URL, TESTRAIL_UN, TESTRAIL_PW or by CLI parameters --url=blabala --username=blubulu --password=wowow
 - debug messages can be switched on by CLI flag --debug
 - test plan ID is configured by CLI parameter -p or --planId
 - skipped test cases are reported with custom TestRail result id, defined by --skipStatus CLI parameter 

Current limitations:
 - if case is skipped then it doesn't affect results sent
 - if TestRail case is met in two or more test runs of a test plan, nothing is sent; use runId instead