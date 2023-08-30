const prettier = require('prettier')

let globalConfig;

async function getConfig() {
    if (globalConfig === undefined) {

        const config = await prettier.resolveConfig(process.cwd());
        globalConfig = { ...config || {}, parser: 'typescript', };
    }
    return globalConfig
}


async function format(code = '') {
    try {
        const config = await getConfig();
        const source = prettier.format(code, config);
        return source
    } catch (error) {
        console.error("format error and return original code")
        return code;
    }

}

module.exports = {
    format
}