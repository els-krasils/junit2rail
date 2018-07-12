#! /usr/bin/env node

'use strict'

let argv = require('minimist')(process.argv.slice(2))
let cliFactory = require('./src/cli.js')
let command = argv._[0]
let cli = cliFactory(argv)

// Check if the provided command exists, then execute.
if (cli.hasOwnProperty(command)) {
    cli[command]()
        .catch(err => {
            console.error(err.stack)
            process.exit(1)
        })
} else {
    console.error('Unknown command "' + command + '"')
    process.exit(1)
}
