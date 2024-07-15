const { j, createTemplateElement } = require('./common');

const CLASS_NAME_ATTRIBUTE = 'className';

/**
 * @description 获取jsx中的className属性值
 * @param {JSXAttribute path} path
 * @returns {node}
 */
function getClassNameAttributeCompression(path) {
    let classNameNode = null;
    let clsPath = null;
    j(path)
        .find(j.JSXAttribute, { name: { name: 'className' } })
        .forEach((p) => {
            classNameNode = p.value.value.type === "JSXExpressionContainer" ? p.value.value.expression : p.value.value;
            clsPath = p;
        });

    return { classNameNode, clsPath };
}


/**
 * 
 * @param {*} path styleName value的path节点
 * @param {*} classNameNode className value的node节点
 */
function appendClassNameAttribute(path, classNameNode) {
    const JSXAttributeNode = path.value;
    const JSXAttributeNodeValue = JSXAttributeNode.value;
    const nodeValueCompression = JSXAttributeNodeValue?.expression;
    const nodeValueCompressionType = nodeValueCompression?.type;

    let compression = null;

    switch (nodeValueCompressionType) {
        case 'MemberExpression':
        case 'LogicalExpression':
        case 'ConditionalExpression': {
            const templateElements = [createTemplateElement(''), createTemplateElement(' '), createTemplateElement('')];
            compression = j.templateLiteral(templateElements, [nodeValueCompression, classNameNode]);
            break;
        }
        case 'CallExpression': {
            const templateElements = [createTemplateElement(''), createTemplateElement('')];
            const lastArgument = j.templateLiteral(templateElements, [classNameNode]);
            const arguments = nodeValueCompression.arguments;
            arguments.push(lastArgument);
            compression = j.callExpression(nodeValueCompression.callee, arguments);
            break;
        }
        case 'TemplateLiteral': {
            const quasis = nodeValueCompression.quasis;
            const expressions = nodeValueCompression.expressions;
            quasis.splice(quasis.length - 2, 0, createTemplateElement(' '))
            compression = j.templateLiteral(quasis, [...expressions, classNameNode]);
            break;
        }
    }
    j(path).replaceWith((p) => {
        p.value.value.expression = compression;
        return p.value;
    })
}


function deleteClassNameAttribute(path) {
    j(path)
        .find(j.JSXAttribute, { name: { name: 'className' } })
        .forEach(path => {
            j(path).remove();
        })
}

module.exports = {
    appendClassNameAttribute,
    getClassNameAttributeCompression,
    deleteClassNameAttribute
};
