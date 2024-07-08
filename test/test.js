const config$ = require('../lib/config');
const { run } = require('../lib/stl2cls');

const entry = ['test/*.tsx'];

config$.setConfig({
    entry,
    computed: false,
});

run({ entry, computed: false });
