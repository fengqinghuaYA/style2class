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
const { getClassNameAttributeCompression, deleteClassNameAttribute } = require('./classname');

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
                const { classNameNode, clsPath } = getClassNameAttributeCompression(path);
                let transfered = false;
                j(path)
                    .find(j.JSXAttribute, { name: { name: 'styleName' } })
                    .forEach((p) => {
                        transfered = transfer(p, classNameNode);
                        if (!transfered) {
                            errorLines.push(p.value.loc.start.line);
                        } else {
                            if (clsPath) {
                                deleteClassNameAttribute(path);
                            }
                            j(p).replaceWith((node) => {
                                node.value.name.name = 'className';
                                return node.value;
                            });
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
