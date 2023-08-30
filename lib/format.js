const prettier = require('prettier');
const colors = require('colors');

let globalConfig;

async function getConfig() {
    if (globalConfig === undefined) {

        const config = await prettier.resolveConfig(process.cwd());
        globalConfig = { ...config || {}, parser: 'typescript', };
    }
    return globalConfig
}


async function format(code = '', file) {
    try {
        const config = await getConfig();
        const source = prettier.format(code, config);
        return source
    } catch (error) {
        console.error(colors.red("This file can't be formatted: " + file));
        return code;
    }

}

module.exports = {
    format
}