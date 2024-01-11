const { literalTransfer } = require('./literal');
const { logicalTransfer } = require('./logical');
const { conditionalTransfer } = require('./conditional');
const { callExpressionTransfer } = require('./call');
const { templateLiteralTransfer } = require('./templateLiteral');

module.exports = {
    literalTransfer,
    logicalTransfer,
    conditionalTransfer,
    callExpressionTransfer,
    templateLiteralTransfer,
};
