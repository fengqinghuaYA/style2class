const {
    literalTransfer,
    logicalTransfer,
    conditionalTransfer,
    callExpressionTransfer,
    templateLiteralTransfer,
} = require('./case');
const { supportTypes } = require('./common');
const { appendClassNameAttribute } = require('./classname');

/**
 * @param {JSXAttribute path} path 取值：node = path.value
 * @param {node} classNameNode 
 */
function transfer(path, classNameNode) {
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
            case 'StringLiteral':
            case "Literal":
                literalTransfer(path);
                transfered = true;
                break;
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

    if (transfered && !!classNameNode) {
        appendClassNameAttribute(path, classNameNode);
    }

    return transfered;
}

module.exports = {
    transfer,
};
