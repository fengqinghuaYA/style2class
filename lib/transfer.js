const {
    literalTransfer,
    logicalTransfer,
    conditionalTransfer,
    callExpressionTransfer,
    templateLiteralTransfer,
} = require('./case');
const { supportTypes } = require('./common');
/**
 * @param {JSXAttribute path} path 取值：node = path.value
 */
function transfer(path) {
    const JSXAttributeNode = path.value;
    const JSXAttributeNodeValue = JSXAttributeNode.value;
    const nodeValueType = JSXAttributeNodeValue.type;
    const nodeValueCompressionType = JSXAttributeNodeValue?.expression?.type;

    let transfered = false;

    if (nodeValueType === 'StringLiteral' || nodeValueType === 'Literal') {
        literalTransfer(path);
        transfered = true;
    } else if (supportTypes.includes(nodeValueCompressionType)) {
        switch (nodeValueCompressionType) {
            case 'LogicalExpression':
                transfered = logicalTransfer(path);
                break;
            case 'ConditionalExpression':
                transfered = conditionalTransfer(path);
                break;
            case 'CallExpression':
                transfered = callExpressionTransfer(path);
                break;
            case 'TemplateLiteral':
                transfered = templateLiteralTransfer(path);
                break;
        }
    }

    return transfered;
}

module.exports = {
    transfer,
};
