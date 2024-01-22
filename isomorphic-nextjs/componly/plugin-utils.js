const { types: t, parseSync, loadPartialConfig } = require('@babel/core');
const fs = require('fs');
const scanner = require('react-scanner');
const nodePath = require('path');
const configfromfile = require('./componly.config');

function handleExportedTaggedTemplateExpressionAndCallExpression(path, components, config) {
    if (path.node.declaration && path.node.declaration.declarations) {
        const variableName = path.node.declaration.declarations.find(dec => dec.type === 'VariableDeclarator').id.name;
        const init = path.node.declaration.declarations.find(dec => dec.type === 'VariableDeclarator').init;
        if (variableName) {
            const component = components.find(compo => compo.displayName === variableName);
            if (component) {
                findAndSetComponentImportedFromId(component, init);
                if (component.importedFromId) {
                    updateComponentUiLibMetaData(component, path, config);
                }
                if (component.type === 'StyledComponent' && component.importedFromId) {
                    applyAttributesToStyledComponent(component, init)
                }
            }

        }
    }
}

function findAndSetComponentImportedFromId(component, init) {
    const initType = init.type;
    switch (initType) {
        case 'TaggedTemplateExpression':
            component.type = 'StyledComponent'
            const tag = init.tag;
            const idType = tag.type;
            switch (idType) {
                case 'Identifier':
                    component.importedFromId = tag.name;
                    break;
                case 'MemberExpression':
                    component.importedFromId = tag.object.name;
                    break;
                case 'CallExpression':
                    switch (tag.callee.type) {
                        case 'MemberExpression':
                            component.importedFromId = tag.callee.object.object.name;
                            break;
                        case 'Identifier':
                            component.importedFromId = tag.callee.name;
                            break;
                    }
                    break;
            }
            break;
        case 'CallExpression':
            const callee = init.callee;
            switch (callee.type) {
                case 'CallExpression':
                    component.importedFromId = callee.callee.name;
                    break;
                case 'MemberExpression':
                    component.importedFromId = callee.object.name;
                    break;
            }
            break;
    }
}

function updateComponentUiLibMetaData(component, path, config) {
    const importDeclaration = path.parentPath.node.body.find(
        item => item.type === 'ImportDeclaration' && item.specifiers.find(s => s.local.name === component.importedFromId)
    );
    if (importDeclaration) {
        component.moduleName = importDeclaration.source.value;
        if (component.moduleName) {
            const uiLib = config.importedFrom.find(lib => lib.match === component.moduleName);
            if (uiLib) {
                component.uiLibrary = uiLib.name;
                component.designsystem = uiLib.isDesignSystem;
            }
        }
    }
}

function applyAttributesToStyledComponent(component, init) {
    let attributes = [
        {
            identifier: 'data-component-name',
            expression: {
                type: 'string',
                value: component.displayName
            }
        },
        {
            identifier: 'data-designsystem',
            expression: {
                type: 'string',
                value: component.designsystem ? 'true' : 'false'
            }
        }
    ];

    if (component.uiLibrary) {
        attributes = [
            ...attributes,
            {
                identifier: 'data-uilib',
                expression: {
                    type: 'string',
                    value: component.uiLibrary
                }
            }
        ]
    }

    switch (init.tag.type) {
        case 'CallExpression':
            switch (init.tag.callee.type) {
                case 'MemberExpression':
                    init.tag = t.callExpression(
                        t.memberExpression(
                            t.memberExpression(
                                t.identifier(component.importedFromId),
                                t.identifier(init.tag.callee.object.property.name)
                            ),
                            t.identifier('attrs')
                        ),
                        [
                            t.arrowFunctionExpression(
                                [t.identifier('props')],
                                init.tag.arguments.length ? t.objectExpression(
                                    [...init.tag.arguments[0].body.properties,
                                    ...attributes.map(attr => {
                                        return t.objectProperty(
                                            t.stringLiteral(attr.identifier),
                                            t.stringLiteral(attr.expression.value)
                                        )
                                    })]
                                ) : t.objectExpression(
                                    attributes.map(attr => {
                                        return t.objectProperty(
                                            t.stringLiteral(attr.identifier),
                                            t.stringLiteral(attr.expression.value)
                                        )
                                    })
                                ),
                            )
                        ]
                    );
                    break;
            }
            break;
        default:
            init.tag = t.callExpression(
                t.memberExpression(
                    t.memberExpression(
                        t.identifier(component.importedFromId),
                        t.identifier(init.tag.property.name)
                    ),
                    t.identifier('attrs')
                ),
                [
                    t.arrowFunctionExpression(
                        [t.identifier('props')],
                        t.objectExpression(
                            attributes.map(attr => {
                                return t.objectProperty(
                                    t.stringLiteral(attr.identifier),
                                    t.stringLiteral(attr.expression.value)
                                )
                            })
                        ),
                    )
                ]
            );
    }
}

function handleTaggedTemplateExpressionAndCallExpressionVariables(path, components, config) {
    if (path.parentPath.type === 'Program') {
        const variableName = path.node.declarations.find(dec => dec.type === 'VariableDeclarator').id.name;
        const init = path.node.declarations.find(dec => dec.type === 'VariableDeclarator').init;
        if (init) {
            const initType = init.type;
            if (variableName) {
                const component = components.find(compo => compo.displayName === variableName);
                if (component) {
                    switch (initType) {
                        case 'TaggedTemplateExpression':
                            component.type = 'StyledComponent';
                            const tag = init.tag;
                            const idType = tag.type;
                            switch (idType) {
                                case 'Identifier':
                                    component.importedFromId = tag.name;
                                    break;
                                case 'MemberExpression':
                                    component.importedFromId = tag.object.name;
                                    break;
                            }
                            break;
                        case 'CallExpression':
                            const callee = init.callee;
                            switch (callee.type) {
                                case 'CallExpression':
                                    component.importedFromId = callee.callee.name;
                                    break;
                                case 'MemberExpression':
                                    component.importedFromId = callee.object.name;
                                    break;
                            }
                            break;
                    }
                    if (component.importedFromId) {
                        const importDeclaration = path.parentPath.node.body.find(
                            item => item.type === 'ImportDeclaration' && item.specifiers.find(s => s.local.name === component.importedFromId)
                        );
                        if (importDeclaration) {
                            component.moduleName = importDeclaration.source.value;
                            if (component.moduleName) {
                                const uiLib = config.importedFrom.find(lib => new RegExp(lib.match, 'gm').test(component.moduleName));
                                if (uiLib) {
                                    component.uiLibrary = uiLib.name;
                                    component.designsystem = uiLib.isDesignSystem;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

async function scan(path, config) {
    let components = [];
    if (config.importedFrom && config.importedFrom.length) {
        const importedFrom = config.importedFrom;
        components = await Promise.all(importedFrom.map((uiLib) => {
            let scannerConfig = {
                crawlFrom: path,
                includeSubComponents: true,
                processors: ['raw-report'],
                exclude: ['node_modules', 'build', 'public', 'styles', 'utils'],
            };
            if (uiLib.match !== '*') {
                scannerConfig.importedFrom = uiLib.match;
            }
            return scanner.run(scannerConfig, '').then((result) => {
                let htmlTags = [
                    "a",
                    "abbr",
                    "address",
                    "area",
                    "article",
                    "aside",
                    "audio",
                    "b",
                    "base",
                    "bdi",
                    "bdo",
                    "blockquote",
                    "body",
                    "br",
                    "button",
                    "canvas",
                    "caption",
                    "cite",
                    "code",
                    "col",
                    "colgroup",
                    "data",
                    "datalist",
                    "dd",
                    "del",
                    "details",
                    "dfn",
                    "dialog",
                    "div",
                    "dl",
                    "dt",
                    "em",
                    "embed",
                    "fieldset",
                    "figcaption",
                    "figure",
                    "footer",
                    "form",
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "h5",
                    "h6",
                    "head",
                    "header",
                    "hgroup",
                    "hr",
                    "html",
                    "i",
                    "iframe",
                    "img",
                    "input",
                    "ins",
                    "kbd",
                    "label",
                    "legend",
                    "li",
                    "link",
                    "main",
                    "map",
                    "mark",
                    "math",
                    "menu",
                    "menuitem",
                    "meta",
                    "meter",
                    "nav",
                    "noscript",
                    "object",
                    "ol",
                    "optgroup",
                    "option",
                    "output",
                    "p",
                    "path",
                    "param",
                    "picture",
                    "pre",
                    "progress",
                    "q",
                    "rb",
                    "rp",
                    "rt",
                    "rtc",
                    "ruby",
                    "s",
                    "samp",
                    "script",
                    "section",
                    "select",
                    "slot",
                    "small",
                    "source",
                    "span",
                    "strong",
                    "style",
                    "sub",
                    "summary",
                    "sup",
                    "svg",
                    "table",
                    "tbody",
                    "td",
                    "template",
                    "textarea",
                    "tfoot",
                    "th",
                    "thead",
                    "time",
                    "title",
                    "tr",
                    "track",
                    "u",
                    "ul",
                    "var",
                    "video",
                    "wbr"
                ];
                if (config.includeHtmlComponents) {
                    htmlTags = htmlTags.filter(c => !config.includeHtmlComponents.includes(c))
                }
                const reacteExclude = ['Fragment', 'Component', 'ThemeProvider'];
                const exclude = config.excludeComponents ? [...reacteExclude, ...config.excludeComponents] : reacteExclude;
                const react = Object.keys(result)
                    .filter(key => !htmlTags.includes(key))
                    .filter(key => !exclude.includes(key));
                return react.map(key => {
                    return {
                        ...result[key],
                        displayName: key,
                        designsystem: uiLib.isDesignSystem,
                        uiLibrary: uiLib.name,
                        usage:
                            result[key].instances && result[key].instances[0] &&
                                result[key].instances[0].importInfo &&
                                result[key].instances[0].importInfo.moduleName &&
                                result[key].instances[0].importInfo.moduleName.startsWith('.') ?
                                'localImport'
                                : result[key].instances && result[key].instances[0] &&
                                    !result[key].instances[0].importInfo ? 'sameFileDeclaration' : 'moduleImport'
                    }
                })
            });
        }));

        components = components.reduce((prev, curr) => {
            let newItems = curr.filter(c => {
                return !prev.map(co => co.displayName).includes(c.displayName);
            });
            prev = [...prev, ...newItems];
            return prev;
        }, []);
    } else {
        components = await scanner.run({
            crawlFrom: paths.root,
            includeSubComponents: true,
            processors: ['raw-report'],
            exclude: ['node_modules', 'build', 'public', 'styles', 'utils'],
        }, '').then((result) => {
            let htmlTags = [
                "a",
                "abbr",
                "address",
                "area",
                "article",
                "aside",
                "audio",
                "b",
                "base",
                "bdi",
                "bdo",
                "blockquote",
                "body",
                "br",
                "button",
                "canvas",
                "caption",
                "cite",
                "code",
                "col",
                "colgroup",
                "data",
                "datalist",
                "dd",
                "del",
                "details",
                "dfn",
                "dialog",
                "div",
                "dl",
                "dt",
                "em",
                "embed",
                "fieldset",
                "figcaption",
                "figure",
                "footer",
                "form",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "head",
                "header",
                "hgroup",
                "hr",
                "html",
                "i",
                "iframe",
                "img",
                "input",
                "ins",
                "kbd",
                "label",
                "legend",
                "li",
                "link",
                "main",
                "map",
                "mark",
                "math",
                "menu",
                "menuitem",
                "meta",
                "meter",
                "nav",
                "noscript",
                "object",
                "ol",
                "optgroup",
                "option",
                "output",
                "p",
                "path",
                "param",
                "picture",
                "pre",
                "progress",
                "q",
                "rb",
                "rp",
                "rt",
                "rtc",
                "ruby",
                "s",
                "samp",
                "script",
                "section",
                "select",
                "slot",
                "small",
                "source",
                "span",
                "strong",
                "style",
                "sub",
                "summary",
                "sup",
                "svg",
                "table",
                "tbody",
                "td",
                "template",
                "textarea",
                "tfoot",
                "th",
                "thead",
                "time",
                "title",
                "tr",
                "track",
                "u",
                "ul",
                "var",
                "video",
                "wbr"
            ];
            if (config.includeHtmlComponents) {
                htmlTags = htmlTags.filter(c => !config.includeHtmlComponents.includes(c))
            }
            const reacteExclude = ['Fragment', 'Component', 'ThemeProvider'];
            const exclude = config.excludeComponents ? [...reacteExclude, ...config.excludeComponents] : reacteExclude;
            const react = Object.keys(result)
                .filter(key => !htmlTags.includes(key))
                .filter(key => !exclude.includes(key));
            return react.map(key => {
                return {
                    ...result[key],
                    displayName: key,
                    designsystem: false,
                    usage:
                        result[key].instances && result[key].instances[0] &&
                            result[key].instances[0].importInfo &&
                            result[key].instances[0].importInfo.moduleName &&
                            result[key].instances[0].importInfo.moduleName.startsWith('.') ?
                            'localImport'
                            : result[key].instances && result[key].instances[0] &&
                                !result[key].instances[0].importInfo ? 'sameFileDeclaration' : 'moduleImport'
                }
            })
        });
    }
    return components;
}

function getInstances(components) {
    return components.reduce((prev, curr) => {
        if (curr.instances) {
            prev = [...prev, ...curr.instances.map(inst => {
                return {
                    ...inst, component: curr.displayName
                }
            })];
        }
        return prev;
    }, []);
}

const fileWalker = (base = paths.root, scanSubDirectories = false, regularExpression = /\.js$/) => {
    const files = {};

    function readDirectory(directory) {
        fs.readdirSync(directory).forEach((file) => {
            const fullPath = nodePath.resolve(directory, file);

            if (fs.statSync(fullPath).isDirectory()) {
                if (scanSubDirectories) readDirectory(fullPath);

                return;
            }

            if (!regularExpression.test(fullPath)) return;

            files[fullPath] = true;
        });
    }

    readDirectory(nodePath.resolve(__dirname, base));

    function Module(file) {
        return require(file);
    }

    Module.files = Object.keys(files);
    return Module;
};

function getComponentNameFromStory(content, filePath, options = {}) {
    const TYPESCRIPT_EXTS = {
        '.ts': true,
        '.tsx': true,
    };

    function getDefaultPlugins(options) {
        return [
            'jsx',
            TYPESCRIPT_EXTS[nodePath.extname(options.filename || '')]
                ? 'typescript'
                : 'flow',
            'asyncGenerators',
            'bigInt',
            'classProperties',
            'classPrivateProperties',
            'classPrivateMethods',
            ['decorators', { decoratorsBeforeExport: false }],
            'doExpressions',
            'dynamicImport',
            'exportDefaultFrom',
            'exportNamespaceFrom',
            'functionBind',
            'functionSent',
            'importMeta',
            'logicalAssignment',
            'nullishCoalescingOperator',
            'numericSeparator',
            'objectRestSpread',
            'optionalCatchBinding',
            'optionalChaining',
            ['pipelineOperator', { proposal: 'minimal' }],
            'throwExpressions',
            'topLevelAwait',
        ];
    }

    function buildOptions(
        parserOptions,
        babelOptions,
    ) {
        let parserOpts = {
            plugins: [],
        };

        if (parserOptions) {
            parserOpts = {
                ...parserOptions,
                plugins: parserOptions.plugins ? [...parserOptions.plugins] : [],
            };
        }

        const partialConfig = loadPartialConfig(babelOptions);

        if (!partialConfig.hasFilesystemConfig() && parserOpts.plugins.length === 0) {
            parserOpts.plugins = getDefaultPlugins(babelOptions);
        }

        // Ensure we always have estree plugin enabled, if we add it a second time
        // here it does not matter
        parserOpts.plugins.push('estree');

        return parserOpts;
    }

    const { parserOptions, ...babelOptions } = options;
    const parserOpts = buildOptions(parserOptions, babelOptions);
    const opts = {
        parserOpts,
        ...babelOptions,
    };
    const ast = parseSync(content, opts);
    ast.program.options = options;
    const defaultExport = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration');
    const componentName = defaultExport.declaration.properties.find(prop => prop.key.name === 'component').value.name;
    const storyName = defaultExport.declaration.properties.find(prop => prop.key.name === 'title').value.value;
    const componentPath = ast.program.body.find(node => node.type === 'ImportDeclaration' && node.specifiers.find(s => s.local.name === componentName));

    return {
        displayName: `${componentName}`,
        storyComponentName: `${componentName}Story`,
        path: componentPath.source.value,
        description: '',
        methods: [],
        designsystem: true,
        storyPath: filePath,
        storyName
    };
}

function scanForStories(components, path, config) {
    const storyRegExp = config.storyRegExp ? typeof config.storyRegExp === 'string' ? new RegExp(config.storyRegExp) : config.storyRegExp : /\.componly*(.jsx|.js)$/;
    fileWalker(path, true, storyRegExp).files.forEach((filepath) => {
        const fileContent = fs.readFileSync(filepath);
        const component = getComponentNameFromStory(fileContent.toString(), filepath);
        components = [...components.filter(com => com.displayName !== component.displayName), { ...components.find(com => com.displayName === component.displayName), ...component }];
    });
}

async function getConfig() {
    let config;
    try {
        config = await (await fetch('http://localhost:4001/projects/19/config')).json();
        if (!config) {
            console.warn('Not able to connect to componly');
            config = configfromfile;
            // return {
            //     visitor: {}
            // };
        }
        if (!config.success) {
            console.warn(config.message);
            config = configfromfile;
        }
        if (!config.data) {
            console.warn(config.message);
            config = configfromfile;
        }
        if (config && config.success && config.data) {
            config = config.data;
        }
    } catch (error) {
        console.warn(error.message);
        config = configfromfile;
        // return {
        //     visitor: {}
        // };
    }
    return config;
}

module.exports = {
    handleExportedTaggedTemplateExpressionAndCallExpression,
    handleTaggedTemplateExpressionAndCallExpressionVariables,
    scan,
    getInstances,
    scanForStories,
    getConfig
}