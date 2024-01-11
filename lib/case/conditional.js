const { j } = require('../common');

const { conditionalHandler } = require('./handler');

/**
 * 三元表达式
 * @param {JSXAttribute path} path
 */
function conditionalTransfer(path) {
    let transfered = false;
    j(path).replaceWith((p) => {
        const JSXAttributeNode = p.value;
        const compressionNode = JSXAttributeNode.value.expression;

        const { transfered: conditionalTransfered, node } = conditionalHandler(compressionNode);

        transfered = conditionalTransfered;
        if (transfered) {
            p.value.value.expression = node;
        }

        return p.value;
    });

    return transfered;
}

module.exports = {
    conditionalTransfer,
};
