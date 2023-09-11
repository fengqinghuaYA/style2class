#!/usr/bin/env node

const argv = require('yargs').argv;
const path = require('path');
const style2class = require('../lib/stl2cls');
const removeComputed = require('../lib/removeComputed');

const config = require(path.join(process.cwd(), 'package.json'))['style2class'];
const command = argv['_'][0];

if (command === 'run') {
    console.info("this task is running...")
    style2class.run(config);
    console.info("this task is done!")
}

if (command === 'remove') {
    console.info("remove task is running...")
    removeComputed.run(config)
    console.info("remove task is done!")
}