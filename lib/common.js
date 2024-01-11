const fg = require('fast-glob');
const jscodeshift = require('jscodeshift');
const j = jscodeshift.withParser('tsx');
const fs = require('fs-extra');
const colors = require('colors');

/**
 * 获取路径匹配的实际路径数组
 * @param {string[]} entry
 * @returns
 */
const getEntryPath = (entry) => {
    const entries = fg.sync(entry, {
        dot: true,
        cwd: process.cwd(),
    });
    return entries;
};

/**
 * 源码 转 ast 语法树
 * @param {string} entry
 * @returns ast 语法树
 */
const getAstFromSource = (entry) => {
    let source = fs.readFileSync(entry, { encoding: 'utf8' });
    const ast = j(source);
    return ast;
};

/**
 * ast 语法树 转 源码
 * @param ast
 * @returns name string[]
 */
const getSourceFromAst = (ast) => {
    return ast.toSource({ lineTerminator: '\n', quote: 'single' });
};

/**
 * 创建memberExpression
 * @param {string} key
 * @param {string} value
 * @returns {ObjectExpression}
 */

function createMemberExpression(key, value, computed) {
    const isValid = !value.includes('-');
    const isRmComputed = !computed && isValid;

    const memberExpression = j.memberExpression(
        j.identifier(key),
        isRmComputed ? j.identifier(value) : j.stringLiteral(value),
        !isRmComputed
    );
    return memberExpression;
}

/**
 * 创建TemplateElement
 * @param {string} value
 * @returns {TemplateElement}
 */
function createTemplateElement(value) {
    return j.templateElement({ raw: value, cooked: value }, false);
}

/**
 * 支持的type
 */
const supportTypes = [
    'Literal',
    'TemplateLiteral',
    'ConditionalExpression',
    'CallExpression',
    'LogicalExpression',
];

/**
 * 判断是不是字符串类型
 * @param {string} type
 * @returns  {boolean}
 */
function isLiteralType(type) {
    return type === 'Literal' || type === 'StringLiteral';
}

/**
 *
 * @param {string} filePath
 * @param {number[]} lines
 */
function outputErrorFile(filePath, lines) {
    if (!lines || lines.length === 0) {
        console.info(colors.green(`文件"${filePath}"好棒棒！！！`));
        return;
    }
    console.info(colors.red(`文件"${filePath}"有脏东西,要手动处理:`));
    lines.forEach((line) => {
        console.info(colors.yellow(`    ${filePath}:${line}`));
    });
}

const CLASSNAMES_PACKAGE_NAME = 'classnames';

/**
 * 找到classNames默认导入后的标识符
 * @param {*} originData
 */
function getGlobalClassNamesIdentifier(originData) {
    let globalClassNamesIdentifier = null;
    originData.find(j.ImportDeclaration).forEach((path) => {
        const importDeclarationNode = path.value;
        const source = importDeclarationNode.source;
        const sourceValue = source.value;
        if (sourceValue === CLASSNAMES_PACKAGE_NAME) {
            const specifiers = importDeclarationNode.specifiers;
            const importDefaultSpecifier = specifiers.find(
                (v) => v.type === 'ImportDefaultSpecifier'
            );
            !globalClassNamesIdentifier &&
                (globalClassNamesIdentifier = importDefaultSpecifier.local.name);
        }
    });
    return globalClassNamesIdentifier;
}

module.exports = {
    getAstFromSource,
    getEntryPath,
    getSourceFromAst,
    createMemberExpression,
    createTemplateElement,
    isLiteralType,
    outputErrorFile,
    getGlobalClassNamesIdentifier,
    supportTypes,
    j,
};
