const fg = require("fast-glob");
const jscodeshift = require("jscodeshift");
const j = jscodeshift.withParser("tsx");
const fs = require("fs-extra");
const { get, upperFirst, sortBy } = require("lodash");
const { format } = require('./format')
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

/**
 * 获取import的变量名
 * @param {ImportDeclaration Node} node
 * @returns name string[]
 */
function getImportVariableNames(node) {
    const names = [];
    const specifiers = node.specifiers ?? [];
    specifiers.forEach((spe) => {
        names.push(spe.local.name)
    })
    return names;
}

/**
 * 获取const or let 变量名
 * @param {VariableDeclaration Node} node
 * @returns name string[]
 */
function getVariableNames(node) {
    const names = [];
    const declarations = node.declarations ?? [];
    declarations.forEach((dec) => {
        names.push(dec.id.name);
    });
    return names;
}

/**
 * 获取全局变量名(import,const,let)
 * @param {string} ast
 * @returns {string[]} variableNames
 */
function getGlobalVariableNames(ast) {
    const variables = [];
    ast
        .find(j.Program)
        .paths()
        .forEach((path) => {
            const body = get(path, "value.body", []);
            body.map((it) => {
                if (it.type === "VariableDeclaration") {
                    const names = getVariableNames(it);
                    variables.push(...names);
                }
                if (it.type === "ImportDeclaration" && it.specifiers.length > 0) {
                    const names = getImportVariableNames(it);
                    variables.push(...names);
                }
            });
        });
    return variables;
}

/**
 * @param {string[]} globalVars
 * @returns {name} styleName
 */
function getGlobalStyleId(globalVars) {
    if (!globalVars.includes('style')) return 'style';
    if (!globalVars.includes('styles')) return 'styles';

    const rename = (index) => {
        const newName = `style${index}`;
        if (!globalVars.includes(newName)) return newName;
        return rename(index + 1);
    }

    return rename(1)
}

/** 
 * 转换less import语句
 * @param {string} ast
 * @returns { isImportLess: boolean, specifier: string }
 */
function importDeclarationTransfer(originData) {
    let isImportLess = false;
    let specifier = "";
    let isUseStyleName = false;

    originData.find(j.ImportDeclaration).forEach((path) => {
        const importValue = get(path, "value.source.value");
        const isLess = importValue.endsWith(".less");
        if (isLess) {
            isImportLess = true;
            const isImportDefaultSpecifier =
                get(path, "value.specifiers[0].type") === "ImportDefaultSpecifier";
            if (isImportDefaultSpecifier) {
                const names = getImportVariableNames(path.value);
                specifier = names[0];
            } else {
                const globalVars = getGlobalVariableNames(originData);
                specifier = getGlobalStyleId(globalVars);
                j(path).replaceWith((p) => {
                    p.value.specifiers = [
                        {
                            type: "ImportDefaultSpecifier",
                            local: {
                                type: "Identifier",
                                name: specifier,
                            },
                        },
                    ];
                    return p.value;
                });
            }
        }
    });

    originData.find(j.JSXAttribute).forEach(p => {
        if (p.value.name.name === 'styleName') {
            isUseStyleName = true;
        }
    });

    return { isImportLess, specifier, isUseStyleName };
}

/**
 * 判断是不是html标签
 * @param {string} name
 * @returns {boolean}
 */
function isHtmlTag(name) {
    return upperFirst(name) !== name
}

/**
 * 创建TemplateElement
 * @param {string} value
 * @returns {TemplateElement}
 */
function createTemplateElement(value) {
    return j.templateElement({ raw: value, cooked: value }, false)
}

/**
 * 创建expression
 * @param {string} key
 * @param {string} value
 * @returns {ObjectExpression}
 */

function createJsxExpressionContainer(key, value) {
    const memberExpression = j.jsxExpressionContainer(j.memberExpression(j.identifier(key), j.identifier(value)));
    return memberExpression
}
/**
 * 创建memberExpression
 * @param {string} key
 * @param {string} value
 * @returns {ObjectExpression}
 */

function createMemberExpression(key, value) {
    const memberExpression = {
        type: "MemberExpression",
        object: {
            type: "Identifier",
            name: key
        },
        property: j.stringLiteral(value),
        computed: true
    }
    return memberExpression
}

/**
 * 转换StringLiteral形式的styleName
 * @param {StringLiteral Node} path
 */
function stringLiteralTransfer(path, specifier) {
    const stringLiterals = path.value.value.value;
    const splits = stringLiterals.split(' ');

    j(path).replaceWith(p => {
        if (splits.length === 1) {

            const memberExpression = j.jsxExpressionContainer(j.memberExpression(j.identifier(specifier), j.stringLiteral(splits[0]), true));

            p.value.value = memberExpression;
            p.value.name = j.identifier('className');

            return p.value;
        } else {
            const templateElements = [createTemplateElement(''), ...Array(splits.length - 1).fill(createTemplateElement(' ')), createTemplateElement('')]
            const compressions = splits.map((split) => {
                return j.memberExpression(j.identifier(specifier), j.stringLiteral(split), true)
            })
            const templateLiteral = j.templateLiteral(templateElements, compressions)
            p.value.value = j.jsxExpressionContainer(templateLiteral);
            p.value.name = j.identifier('className');
            return p.value;
        }
    })
}

/**
 * 转换CallExpression形式的styleName(函数调用)
 * @param {StringLiteral Node} path
 */
function callExpressionTransfer(path, specifier) {
    j(path).replaceWith(p => {
        const origins = p.value.value.expression.arguments
        const arguments = origins.map((node) => {
            if (node.type === 'StringLiteral') {
                return j.memberExpression(j.identifier(specifier), j.stringLiteral(node.value), true);
            }
            if (node.type === 'ObjectExpression') {
                const properties = node.properties.map((property) => {
                    const key = j.memberExpression(j.identifier(specifier), j.stringLiteral(property.key.name), true);
                    const objectProperty = j.objectProperty(key, property.value, 'init', true);
                    objectProperty.computed = true;
                    return objectProperty;
                })
                const obj = j.objectExpression(properties)
                return obj

            }
        })
        p.value.value.expression.arguments = arguments;
        p.value.name = j.identifier('className');

        return p.value
    })
}

/**
 * 转换TemplateLiteral形式的styleName(模板字符串)
 * @param {StringLiteral Node} path
 */
function templateLiteralTransfer(path, specifier) {
    const expressions = path.value.value.expression.expressions;
    const quasis = path.value.value.expression.quasis;

    const temToExp = quasis.map((tem) => {
        const key = tem.value.raw.trim();
        if (!key) return null
        return {
            start: tem.start,
            node: createMemberExpression(specifier, key)
        }
    }).filter(v => v && v.node)

    const expToExp = expressions.map((exp) => {
        if (exp.type === 'ConditionalExpression') {
            const consequentExp = !!exp.consequent.value ? createMemberExpression(specifier, exp.consequent.value) : j.stringLiteral('');
            const alternateExp = !!exp.alternate.value ? createMemberExpression(specifier, exp.alternate.value) : j.stringLiteral('');

            return {
                start: exp.start,
                node: j.conditionalExpression(exp.test, consequentExp, alternateExp)
            }
        }
    }).filter(v => v && v.node)

    const newExpressions = sortBy([...expToExp, ...temToExp], 'start').map(v => v.node);

    j(path).replaceWith(p => {

        const templateLiteral = j.templateLiteral([createTemplateElement(''), createTemplateElement(' ')], newExpressions);

        p.value.value.expression = templateLiteral;
        p.value.name = j.identifier('className');

        return p.value
    })
}



const defaultEntry = ["code/**/*.tsx", "code/**/*.ts"];



async function executor(entry = defaultEntry) {
    const entries = getEntryPath(entry);
    console.info(colors.green(`entries: ${entry},file count:${entries.length}`))
    entries.forEach(async (entry) => {
        try {
            const originData = getAstFromSource(entry);

            const { specifier, isImportLess, isUseStyleName } = importDeclarationTransfer(originData);

            if (!isImportLess || !isUseStyleName) {
                return
            }

            originData.find(j.JSXOpeningElement).forEach((path) => {

                j(path).find(j.JSXAttribute).forEach((p) => {
                    if (p.value.name.name === 'styleName') {
                        const type = p.value.value.type
                        if (type === 'StringLiteral') {
                            stringLiteralTransfer(p, specifier)
                        }
                        if (type === "JSXExpressionContainer" && p.value.value.expression.type === "CallExpression") {
                            callExpressionTransfer(p, specifier)
                        }
                        if (type === "JSXExpressionContainer" && p.value.value.expression.type === "TemplateLiteral") {
                            templateLiteralTransfer(p, specifier)

                        }

                    }
                })
            })

            const source = getSourceFromAst(originData);

            const formatted = await format(source, entry);

            fs.writeFileSync(entry, formatted);

            console.info(colors.green(`This file is ok: ${entry}`))

        } catch (error) {
            console.error(colors.red(`This file is error: ${entry}`))
            console.error(colors.red(error))
        }
    });
}



exports.run = executor;
