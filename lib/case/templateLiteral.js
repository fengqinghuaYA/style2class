const { j } = require('../common');
const { templateLiteralHandler } = require('./handler');

/**
 * 模版字符串
 * @param {JSXAttribute path} path
 */
function templateLiteralTransfer(path) {
    let transfered = false;
    j(path).replaceWith((p) => {
        const templateElementNode = p.value.value.expression;
        const { node, transfered: isModified } = templateLiteralHandler(templateElementNode);
        transfered = isModified;
        if (transfered) {
            p.value.value.expression = node;
        }
        return p.value;
    });

    return transfered;
}

module.exports = {
    templateLiteralTransfer,
};
