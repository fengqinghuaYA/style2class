const config$ = require('./config');
const { j } = require('./common');
const { get } = require('lodash');
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
 * 转换less import语句
 * @param {string} ast
 * @returns { isImportLess: boolean, specifier: string }
 */
function importDeclarationTransfer(originData) {
    let isImportedStyle = false;
    let isUseStyleName = false;

    const { cssProcessors } = config$.getConfig();

    const {} = originData.find(j.ImportDeclaration).forEach((path) => {
        const importValue = get(path, 'value.source.value');
        const ext = importValue.split('.').pop();
        const isStyleFile = cssProcessors.includes(ext);
        if (isStyleFile) {
            isImportedStyle = true;
            const isImportDefaultSpecifier =
                get(path, 'value.specifiers[0].type') === 'ImportDefaultSpecifier';
            if (isImportDefaultSpecifier) {
                const names = getImportVariableNames(path.value);
                config$.setState('specifier', names[0]);
            } else {
                const specifier = config$.computeSpecifier();
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

    return { isImportedStyle, isUseStyleName };
}

module.exports = {
    importDeclarationTransfer,
};
