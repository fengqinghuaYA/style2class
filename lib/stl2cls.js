const jscodeshift = require('jscodeshift');
const j = jscodeshift.withParser('tsx');
const { get } = require('lodash');
const { format } = require('./format');
const colors = require('colors');
const fs = require('fs');
const {
    getAstFromSource,
    getEntryPath,
    outputErrorFile,
    getGlobalClassNamesIdentifier,
    getSourceFromAst,
} = require('./common');

const { transfer } = require('./transfer');

/**
 * 获取import的变量名
 * @param {ImportDeclaration Node} node
 * @returns name string[]
 */
function getImportVariableNames(node) {
    const names = [];
    const specifiers = node.specifiers ?? [];
    specifiers.forEach((spe) => {
        names.push(spe.local.name);
    });
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
    ast.find(j.Program)
        .paths()
        .forEach((path) => {
            const body = get(path, 'value.body', []);
            body.map((it) => {
                if (it.type === 'VariableDeclaration') {
                    const names = getVariableNames(it);
                    variables.push(...names);
                }
                if (it.type === 'ImportDeclaration' && it.specifiers.length > 0) {
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
    };

    return rename(1);
}

/**
 * 转换less import语句
 * @param {string} ast
 * @returns { isImportLess: boolean, specifier: string }
 */
function importDeclarationTransfer(originData) {
    let isImportLess = false;
    let specifier = '';
    let isUseStyleName = false;

    originData.find(j.ImportDeclaration).forEach((path) => {
        const importValue = get(path, 'value.source.value');
        const isLess = importValue.endsWith('.less');
        if (isLess) {
            isImportLess = true;
            const isImportDefaultSpecifier =
                get(path, 'value.specifiers[0].type') === 'ImportDefaultSpecifier';
            if (isImportDefaultSpecifier) {
                const names = getImportVariableNames(path.value);
                specifier = names[0];
            } else {
                const globalVars = getGlobalVariableNames(originData);
                specifier = getGlobalStyleId(globalVars);
                j(path).replaceWith((p) => {
                    p.value.specifiers = [
                        {
                            type: 'ImportDefaultSpecifier',
                            local: {
                                type: 'Identifier',
                                name: specifier,
                            },
                        },
                    ];
                    return p.value;
                });
            }
        }
    });

    originData.find(j.JSXAttribute).forEach((p) => {
        if (p.value.name.name === 'styleName') {
            isUseStyleName = true;
        }
    });

    return { isImportLess, specifier, isUseStyleName };
}

async function executor(config = {}) {
    const entry = config.entry ?? [];
    const computed = config.computed ?? true;
    global.style2class = config;
    const entries = getEntryPath(entry);
    console.info(
        colors.green(`entries: ${entry},file count:${entries.length},computed:${computed}`)
    );
    entries.forEach(async (entry) => {
        try {
            const originData = getAstFromSource(entry);

            const { specifier, isImportLess, isUseStyleName } = importDeclarationTransfer(
                originData
            );
            global.style2class.specifier = specifier;

            if (!isImportLess || !isUseStyleName) {
                return;
            }

            const errorLines = [];
            const globalClassNamesIdentifier = getGlobalClassNamesIdentifier(originData);

            global.style2class.globalClassNamesIdentifier = globalClassNamesIdentifier;

            let hasClassNamesAttribute = false;

            originData.find(j.JSXOpeningElement).forEach((path) => {
                j(path)
                    .find(j.JSXAttribute)
                    .forEach((p) => {
                        if (p.value.name.name === 'className') {
                            hasClassNamesAttribute = true;
                            errorLines.push(p.value.loc.start.line);
                        }
                    });
                if (hasClassNamesAttribute) {
                    return;
                }
                j(path)
                    .find(j.JSXAttribute)
                    .forEach((p) => {
                        if (p.value.name.name === 'styleName') {
                            const transfered = transfer(p);
                            if (!transfered) {
                                errorLines.push(p.value.loc.start.line);
                            } else {
                                j(p).replaceWith((node) => {
                                    node.value.name.name = 'className';
                                    return node.value;
                                });
                            }

                            console.log('code:', j(p).toSource());
                        }
                    });
            });

            outputErrorFile(entry, errorLines);

            const hasError = errorLines.length > 0;

            let source = getSourceFromAst(originData);

            if (!hasError) {
                source = await format(source, entry);
            }

            fs.writeFileSync(entry, source);
        } catch (error) {
            console.error(colors.red(`This file is error: ${entry}`));
            console.error(colors.red(error));
        }
    });
}

exports.run = executor;
