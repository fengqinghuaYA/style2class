const { j } = require('../common');
const { callExpressionHandler } = require('./handler');

/**
 * 函数调用
 * @param {JSXAttribute path} path
 */
function callExpressionTransfer(path) {
    let transfered = false;
    j(path).replaceWith((p) => {
        const JSXAttributeNode = p.value;
        const compressionNode = JSXAttributeNode.value.expression;

        const { transfered: callTransfered, node } = callExpressionHandler(compressionNode);

        transfered = callTransfered;
        if (transfered) {
            p.value.value.expression = node;
        }

        return p.value;
    });

    return transfered;
}

module.exports = {
    callExpressionTransfer,
};
