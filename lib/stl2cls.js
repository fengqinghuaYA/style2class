const fg = require("fast-glob");
const jscodeshift = require("jscodeshift");
const j = jscodeshift.withParser("tsx");
const fs = require("fs-extra");
const { get, upperFirst, sortBy } = require("lodash");
const { format } = require('./format')
const colors = require('colors');
const { getAstFromSource, getEntryPath, getSourceFromAst } = require("./common")



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
    if (!globalVars.includes('s')) return 's';

    const rename = (index) => {
        const newName = `s${index}`;
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

function createMemberExpression(key, value, computed) {

    const isValid = !value.includes("-");
    const isRmComputed = !computed && isValid

    const memberExpression = j.memberExpression(j.identifier(key), isRmComputed ? j.identifier(value) : j.stringLiteral(value), !isRmComputed)
    return memberExpression
}

/**
 * 转换StringLiteral形式的styleName
 * @param {StringLiteral Node} path
 */
function stringLiteralTransfer(path, specifier, computed) {
    const stringLiterals = path.value.value.value;
    const splits = stringLiterals.split(' ');

    j(path).replaceWith(p => {
        if (splits.length === 1) {

            const memberExpression = j.jsxExpressionContainer(createMemberExpression(specifier, splits[0]), computed)

            p.value.value = memberExpression;
            p.value.name = j.identifier('className');

            return p.value;
        } else {
            const templateElements = [createTemplateElement(''), ...Array(splits.length - 1).fill(createTemplateElement(' ')), createTemplateElement('')]
            const compressions = splits.map((split) => {
                return createMemberExpression(specifier, split, computed)
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
function callExpressionTransfer(path, specifier, computed) {
    j(path).replaceWith(p => {
        const origins = p.value.value.expression.arguments
        const arguments = origins.map((node) => {
            if (node.type === 'StringLiteral') {
                return createMemberExpression(specifier, node.value, computed);
            }
            if (node.type === 'ObjectExpression') {
                const properties = node.properties.map((property) => {
                    let keyString = '';
                    if (property.key.type === 'StringLiteral') {
                        keyString = property.key.value
                    } else {
                        keyString = property.key.name
                    }
                    const key = createMemberExpression(specifier, keyString, computed);
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
function templateLiteralTransfer(path, specifier, computed) {
    const expressions = path.value.value.expression.expressions;
    const quasis = path.value.value.expression.quasis;

    const temToExp = quasis.map((tem) => {
        const key = tem.value.raw.trim();
        if (!key) return null
        return {
            start: tem.start,
            node: createMemberExpression(specifier, key, computed)
        }
    }).filter(v => v && v.node)

    const expToExp = expressions.map((exp) => {
        if (exp.type === 'ConditionalExpression') {
            const consequentExp = !!exp.consequent.value ? createMemberExpression(specifier, exp.consequent.value, computed) : j.stringLiteral('');
            const alternateExp = !!exp.alternate.value ? createMemberExpression(specifier, exp.alternate.value, computed) : j.stringLiteral('');

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




async function executor(config = {}) {
    const entry = config.entry ?? []
    const computed = config.computed ?? true
    const entries = getEntryPath(entry);
    console.info(colors.green(`entries: ${entry},file count:${entries.length},computed:${computed}`))
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
                            stringLiteralTransfer(p, specifier, computed)
                        }
                        if (type === "JSXExpressionContainer" && p.value.value.expression.type === "CallExpression") {
                            callExpressionTransfer(p, specifier, computed)
                        }
                        if (type === "JSXExpressionContainer" && p.value.value.expression.type === "TemplateLiteral") {
                            templateLiteralTransfer(p, specifier, computed)

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
