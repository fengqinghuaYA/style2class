const { run } = require('../lib/removeComputed');


const entry = ["test/*.tsx"]

run({ computedEntry: entry })