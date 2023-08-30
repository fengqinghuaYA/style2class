#!/usr/bin/env node

const argv = require('yargs').argv;
const path = require('path');
const runner = require('../lib/index');

const config = require(path.join(process.cwd(), 'package.json'))['style2class'];
const command = argv['_'][0];

if (command === 'run') {
    console.info("this task is running...")
    runner.run(config);
    console.info("this task is done!")
}