const fg = require("fast-glob");
const jscodeshift = require("jscodeshift");
const j = jscodeshift.withParser("tsx");
const fs = require("fs-extra");
const { get, upperFirst, sortBy } = require("lodash");
const { format } = require('./format')
const colors = require('colors');

const { getAstFromSource, getEntryPath, getSourceFromAst } = require("./common")

function executor(config = {}) {

    const entries = getEntryPath(config.computedEntry || []);
    entries.forEach(async (entry) => {
        try {
            const originData = getAstFromSource(entry);

            originData.find(j.JSXOpeningElement).forEach((path) => {

                j(path).find(j.JSXAttribute).forEach((p) => {
                    if (p.value.name.name === 'className') {

                        j(p).find(j.MemberExpression).forEach(mem => {
                            if (mem.value.computed && mem.value.property.type === "StringLiteral" && !mem.value.property.value.includes("-")) {
                                j(mem).replaceWith(m => {
                                    m.value.computed = false;
                                    m.value.property = j.identifier(m.value.property.value);
                                    return m.value;
                                })
                            }
                        })

                    }
                })
            })

            const source = getSourceFromAst(originData);

            const formatted = await format(source, entry);

            fs.writeFileSync(entry, formatted);

            console.info(colors.green(`This file is ok: ${entry}`))

        } catch (error) {
            console.error(colors.red(`This file is error: ${entry}`))
            console.error(colors.red(error))
        }
    });
}

exports.run = executor;