const { run } = require('../lib/stl2cls');

const entry = ['test/*.tsx'];

run({ entry, computed: false });
