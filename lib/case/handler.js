const { j, isLiteralType, createMemberExpression, createTemplateElement } = require('../common');

/**
 * 判断函数调用表是否使用的是classnames函数
 * @param {CallExpression} node
 */
function classnamesIdentifierChecker(node) {
    const { globalClassNamesIdentifier } = global.style2class;
    const callee = node.callee;
    const calleeName = callee.name;
    return calleeName === globalClassNamesIdentifier;
}

/**
 * @param {ObjectExpression} node
 */
function objectExpressionHandler(node) {
    const properties = node.properties.map((property) => {
        const propertyKeyNode = property.key;
        const propertyKeyNodeType = propertyKeyNode.type;
        if (propertyKeyNodeType === 'Identifier' || isLiteralType(propertyKeyNodeType)) {
            const keyString = isLiteralType(propertyKeyNodeType)
                ? property.key.value
                : property.key.name;
            const { specifier, computed } = global.style2class;
            const key = createMemberExpression(specifier, keyString, computed);
            const objectProperty = j.objectProperty(key, property.value, 'init', true);
            objectProperty.computed = true;
            return { node: objectProperty, transfered: true };
        } else {
            return {
                transfered: false,
                node: property,
            };
        }
    });

    const isModified = properties.every((v) => v.transfered);

    return {
        transfered: isModified,
        node: j.objectExpression(properties.map((v) => v.node)),
    };
}

/**
 * @param {ArrayExpression} node
 */
function arrayExpressionHandler(node) {
    const elements = node.elements.map((element) => {
        if (isLiteralType(element.type)) {
            return {
                transfered: true,
                node: literalHandler(element.value),
            };
        }
        return expressionHandler(element);
    });

    const isModified = elements.every((v) => v.transfered);
    return {
        transfered: isModified,
        node: j.arrayExpression(elements.map((v) => v.node)),
    };
}

/**
 * @param {ConditionalExpression.consequent} node
 */
function conditionalSideHandler(node) {
    let newNode = node;

    if (isLiteralType(node.type)) {
        newNode = literalHandler(node.value);
        return { transfered: true, node: newNode };
    }
    return expressionHandler(node);
}

/**
 *
 * @param {ConditionalExpression} compressionNode
 */
function conditionalHandler(compressionNode) {
    const consequentNode = compressionNode.consequent;
    const alternateNode = compressionNode.alternate;

    const { node: newConsequentNode, transfered: consequentTransfered } = conditionalSideHandler(
        consequentNode
    );
    const { node: newAlternateNode, transfered: alternateTransfered } = conditionalSideHandler(
        alternateNode
    );

    return {
        transfered: consequentTransfered && alternateTransfered,
        node: j.conditionalExpression(compressionNode.test, newConsequentNode, newAlternateNode),
    };
}

/**
 * @param {string} content
 */
function literalHandler(content, needContainer = false) {
    if (!content) {
        const node = j.stringLiteral(content);
        return needContainer ? j.jsxExpressionContainer(node) : node;
    }
    const splits = content.split(' ').filter(Boolean);
    const { specifier, computed } = global.style2class;
    if (splits.length === 1) {
        return needContainer
            ? j.jsxExpressionContainer(createMemberExpression(specifier, splits[0], computed))
            : createMemberExpression(specifier, splits[0], computed);
    } else {
        const templateElements = [
            createTemplateElement(''),
            ...Array(splits.length - 1).fill(createTemplateElement(' ')),
            createTemplateElement(''),
        ];
        const compressions = splits.map((split) => {
            return createMemberExpression(specifier, split, computed);
        });
        const templateLiteral = j.templateLiteral(templateElements, compressions);
        return needContainer ? j.jsxExpressionContainer(templateLiteral) : templateLiteral;
    }
}

/**
 *
 * @param {LogicalExpression} node
 */
function logicalHandler(node) {
    const logicalRight = node.right;
    const logicalRightType = logicalRight.type;
    const logicalRightValue = logicalRight.value;
    const isLiteral = isLiteralType(logicalRightType);
    let newLogicalRight = logicalRight;
    if (isLiteral) {
        const expression = literalHandler(logicalRightValue);
        newLogicalRight = expression;
        return {
            transfered: true,
            node: j.logicalExpression(node.operator, node.left, newLogicalRight),
        };
    } else {
        const { node: newNode, transfered } = expressionHandler(logicalRight);

        return {
            transfered,
            node: transfered ? j.logicalExpression(node.operator, node.left, newNode) : node,
        };
    }
}

function checkQuasisValueValid(value, isStart, isEnd) {
    if (isEnd && isStart) return true;
    if (isStart && value.endsWith(' ')) return true;
    if (isEnd && value.startsWith(' ')) return true;
    return value.startsWith(' ') && value.endsWith(' ');
}

/**
 * @param {TemplateElement} node
 */
function quasisHandler(node, index, length) {
    const value = node.value.raw;
    if (!value) {
        return {
            transfered: true,
            node,
        };
    }
    const isStart = index === 0;
    const isEnd = index === length - 1;

    console.log('index,length', index, length);
    if (checkQuasisValueValid(value, isStart, isEnd)) {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            return {
                transfered: true,
                node: j.templateElement({ raw: ' ', cooked: ' ' }, false),
            };
        }
        return {
            transfered: true,
            node: literalHandler(trimmedValue),
        };
    } else {
        return {
            transfered: false,
            node,
        };
    }
}

/**
 * @param {TemplateLiteral} node
 * @returns {node:TemplateElement,transfered:boolean}
 */
function templateLiteralHandler(node) {
    const expressions = node.expressions;
    const quasis = node.quasis;

    const elementLength = quasis.length + expressions.length;

    const quasisNodes = quasis.map((quasi, index) => {
        return quasisHandler(quasi, index * 2, elementLength);
    });

    const expressionNodes = expressions.map((expression) => {
        return expressionHandler(expression);
    });

    const isModified =
        quasisNodes.every((v) => v.transfered) && expressionNodes.every((v) => v.transfered);

    if (isModified) {
        const mergedExpressionNodes = [];
        for (let i = 0; i < quasisNodes.length; i++) {
            const expressionNode = expressionNodes[i];
            const quasisNode = quasisNodes[i];
            mergedExpressionNodes.push(quasisNode.node);
            if (i !== quasisNodes.length - 1) {
                mergedExpressionNodes.push(expressionNode.node);
            }
        }

        const filteredMergedExpressionNodes = mergedExpressionNodes.filter(
            (v) => v.type !== 'TemplateElement'
        );

        const insertQuasisNode = [];

        for (let idx = 0; idx < filteredMergedExpressionNodes.length; idx++) {
            if (idx !== 0) {
                insertQuasisNode.push(j.templateElement({ raw: ' ', cooked: ' ' }, false));
            } else {
                insertQuasisNode.push(j.templateElement({ raw: '', cooked: '' }, false));
            }
        }
        insertQuasisNode.push(j.templateElement({ raw: '', cooked: '' }, true));

        const newTemplateLiteral = j.templateLiteral(
            insertQuasisNode,
            filteredMergedExpressionNodes
        );

        return {
            transfered: true,
            node: newTemplateLiteral,
        };
    } else {
        return {
            transfered: false,
            node,
        };
    }
}
/**
 * @param CallExpression node
 * @returns
 */
function callExpressionHandler(node) {
    let transfered = false;
    const isPass = classnamesIdentifierChecker(node);
    if (!isPass) {
        return {
            transfered,
            node,
        };
    }
    const arguments = node.arguments;

    const newArguments = arguments.map((argument) => {
        if (isLiteralType(argument.type)) {
            return {
                transfered: true,
                node: literalHandler(argument.value),
            };
        }

        return expressionHandler(argument);
    });

    const isModified = newArguments.every((v) => v.transfered);

    return {
        transfered: isModified,
        node: j.callExpression(
            node.callee,
            newArguments.map((v) => v.node)
        ),
    };
}

/**
 * @param {Expression} node
 */
function expressionHandler(node) {
    if (node.type === 'LogicalExpression') {
        return logicalHandler(node);
    }

    if (node.type === 'ConditionalExpression') {
        return conditionalHandler(node);
    }

    if (node.type === 'ObjectExpression') {
        return objectExpressionHandler(node);
    }
    if (node.type === 'ArrayExpression') {
        return arrayExpressionHandler(node);
    }
    if (node.type === 'CallExpression') {
        return callExpressionHandler(node);
    }

    if (node.type === 'TemplateLiteral') {
        return templateLiteralHandler(node);
    }

    return {
        transfered: false,
        node: node,
    };
}

module.exports = {
    templateLiteralHandler,
    expressionHandler,
    quasisHandler,
    quasisHandler,
    logicalHandler,
    literalHandler,
    conditionalHandler,
    conditionalSideHandler,
    arrayExpressionHandler,
    objectExpressionHandler,
    classnamesIdentifierChecker,
    callExpressionHandler,
    expressionHandler,
};
