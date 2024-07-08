const { format } = require('./format');
const colors = require('colors');
const fs = require('fs');
const {
    getAstFromSource,
    getEntryPath,
    outputErrorFile,
    getGlobalClassNamesIdentifier,
    getSourceFromAst,
    j,
} = require('./common');
const config$ = require('./config');
const { importDeclarationTransfer } = require('./importer');
const { transfer } = require('./transfer');

async function executor(config = {}) {
    const { entry, computed, jsxPropertyName } = config$.getConfig();

    const entries = getEntryPath(entry);
    console.info(
        colors.green(`entries: ${entry},file count:${entries.length},computed:${computed}`)
    );
    entries.forEach(async (entry) => {
        try {
            config$.setState('currentFilePath', entry);

            const originData = getAstFromSource(entry);

            const { isImportedStyle, isUseStyleName } = importDeclarationTransfer(originData);

            if (!isImportedStyle || !isUseStyleName) {
                return;
            }

            const errorLines = [];
            const globalClassNamesIdentifier = getGlobalClassNamesIdentifier(originData);

            config$.setState('globalClassNamesIdentifier', globalClassNamesIdentifier);

            originData.find(j.JSXOpeningElement).forEach((path) => {
                let hasClassNamesAttribute = false;
                j(path)
                    .find(j.JSXAttribute)
                    .forEach((p) => {
                        if (p.value.name.name === 'className') {
                            hasClassNamesAttribute = true;
                        }
                    });
                j(path)
                    .find(j.JSXAttribute)
                    .forEach((p) => {
                        if (p.value.name.name === jsxPropertyName) {
                            if (hasClassNamesAttribute) {
                                errorLines.push(p.value.loc.start.line);
                                return;
                            }
                            const transfered = transfer(p);
                            if (!transfered) {
                                errorLines.push(p.value.loc.start.line);
                            } else {
                                j(p).replaceWith((node) => {
                                    node.value.name.name = 'className';
                                    return node.value;
                                });
                            }
                        }
                    });
            });

            outputErrorFile(entry, errorLines);

            const hasError = errorLines.length > 0;

            let source = getSourceFromAst(originData);

            if (!hasError) {
                source = await format(source, entry);
            }

            fs.writeFileSync(entry, source);
        } catch (error) {
            console.error(colors.red(`This file is error: ${entry}`));
            console.error(colors.red(error));
        }
    });
}

exports.run = executor;
