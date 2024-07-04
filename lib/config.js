/**
 * config
 * @param {string[]} entry- 入口文件 详见：https://www.npmjs.com/package/fast-glob
 * @param {boolean} computed - 是否以style['XXX']
 * @param {string[]} computedEntry- 将 style['XXX'] 转换为 style.XXX 的入口文件;
 * @param {string | (filePath:string)=>string} styleObjectName- style 对象的名称
 * @param {string[]} cssProcessors- 支持的预编译语言 'css' | 'less' | 'scss' | 'sass'
 * @param {string} prettierConfig- prettier 配置文件路径，用于格式化代码
 */
class ConfigManager {
    constructor() {
        this.entry = [];
        this.computed = false;
        this.computedEntry = [];
        this.styleObjectName = 's';
        this.cssProcessors = ['less'];
        this.prettierConfig = process.cwd();

        // 运行时状态
        this.state = {
            currentFilePath: '',
            globalClassNamesIdentifier: '',
            specifier: '',
        };
    }
    setConfig = (config) => {
        this.entry = config.entry ?? [];
        this.computed = config.computed ?? false;
        this.computedEntry = config.computedEntry ?? [];
        this.styleObjectName = config.styleObjectName ?? 's';
        this.cssProcessors = config.cssProcessors ?? ['less'];
        this.prettierConfig = config.prettierConfig ?? process.cwd();
    };

    getConfig = () => {
        return {
            entry: this.entry,
            computed: this.computed,
            computedEntry: this.computedEntry,
            styleObjectName: this.styleObjectName,
            cssProcessors: this.cssProcessors,
            prettierConfig: this.prettierConfig,
        };
    };

    setState = (key, value) => {
        this.state[key] = value;
    };

    getState = (key) => {
        return this.state[key];
    };

    computeSpecifier = () => {
        const specifier =
            typeof this.styleObjectName === 'function'
                ? this.styleObjectName(this.getState('currentFilePath'))
                : this.styleObjectName;
        this.setState('specifier', specifier);
        return this.getState('specifier');
    };
}

const config$ = new ConfigManager();

module.exports = config$;
