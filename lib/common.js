
const fg = require("fast-glob");
const jscodeshift = require("jscodeshift");
const j = jscodeshift.withParser("tsx");
const fs = require("fs-extra");

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
    let source = fs.readFileSync(entry, { encoding: "utf8" });
    const ast = j(source);
    return ast;
};

/**
 * ast 语法树 转 源码
 * @param ast
 * @returns name string[]
 */
const getSourceFromAst = (ast) => {
    return ast.toSource({ lineTerminator: "\n", quote: 'single' });
};

module.exports = {
    getAstFromSource, getEntryPath, getSourceFromAst
}