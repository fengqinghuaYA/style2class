const { j } = require('../common');
const { logicalHandler } = require('./handler');

/**
 * 逻辑表达式
 * @param {JSXAttribute path} path
 */
function logicalTransfer(path) {
    let transfered = false;
    j(path).replaceWith((p) => {
        const value = p.value;
        const logicalNode = value.value.expression;
        const { transfered: logicalTransfered, node } = logicalHandler(logicalNode);
        transfered = logicalTransfered;
        if (transfered) {
            p.value.value.expression = node;
        }
        return p.value;
    });

    return transfered;
}

module.exports = {
    logicalTransfer,
    logicalHandler,
};
