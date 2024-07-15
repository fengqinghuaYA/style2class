const { j } = require('../common');
const { literalHandler } = require('./handler');

/**
 * 普通字符串
 * @param {JSXAttribute path} path
 */
function literalTransfer(path) {
    const value = path.value.value.value || path.value.value.expression.value;
    j(path).replaceWith((p) => {
        p.value.value = literalHandler(value, true);

        return p.value;
    });
}

module.exports = {
    literalTransfer,
};
