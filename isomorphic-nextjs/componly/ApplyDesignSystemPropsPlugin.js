const { types: t  } = require('@babel/core');
const paths = {
    root: process.cwd()
};
const { handleExportedTaggedTemplateExpressionAndCallExpression, handleTaggedTemplateExpressionAndCallExpressionVariables, scan, getInstances, scanForStories, getConfig } = require('./plugin-utils');

async function ApplyDesignSystemPropsPlugin() {
    console.log('RRRRRR')
    const config = await getConfig();
    const storyRegExp = config.storyRegExp ? typeof config.storyRegExp === 'string' ? new RegExp(config.storyRegExp) : config.storyRegExp : /\.componly*(.jsx|.js)$/;
    let components = await scan(paths.root, config);
    const instances = getInstances(components);
    console.log(`Componly: Founded ${components.length} components`);
    scanForStories(components, paths.root, config);
    console.log(`Componly: Founded ${components.filter(c => c.designsystem).length} design system components`);
    console.log(`${Math.round(components.filter(c => c.designsystem).length / components.length * 100)} are design system components`)
    return {
        visitor: {
            ExportNamedDeclaration(path, fileinfo) {
                handleExportedTaggedTemplateExpressionAndCallExpression(path, components, config);
            },
            VariableDeclaration(path, fileinfo) {
                handleTaggedTemplateExpressionAndCallExpressionVariables(path, components, config);
            },
            JSXElement(path, fileinfo) {
                if (!storyRegExp.test(fileinfo.filename)) {
                    const jsxName = path.node.openingElement.name.name;
                    if (jsxName) {
                        let component;
                        if (instances.find(inst => inst.importInfo && inst.importInfo.local === jsxName)) {
                            component = components.find(c => c.displayName === instances.find(inst => inst.importInfo && inst.importInfo.local === jsxName).importInfo.imported);
                        }
                        if (!component) {
                            component = components.find(c => jsxName === c.displayName);
                        }
                        let instance;
                        let already;
                        if (component && component.instances) {
                            instance = component.instances.find(inst => inst.location && inst.location.file && inst.location.file === fileinfo.filename);
                            already = path.node.openingElement && path.node.openingElement.attributes.find(attr => attr.name && attr.name.name === 'componly-component-designsystem' && attr.value.value === 'false');
                        }

                        if (instance && !already) {
                            if (component.designsystem) {
                                let styleAttr = {
                                    identifier: 'style',
                                    expression: {
                                        type: 'object',
                                        properties: [
                                            {
                                                identifier: 'border',
                                                value: '1px solid green'
                                            }
                                        ]
                                    }
                                };
                                if (config.styles && config.styles.designsystem) {
                                    styleAttr = {
                                        identifier: 'style',
                                        expression: {
                                            type: 'object',
                                            properties: Object.keys(config.styles.designsystem).map(key => {
                                                return {
                                                    identifier: key,
                                                    value: config.styles.designsystem[key]
                                                }
                                            })
                                        }
                                    };
                                }
                                let attributes = [
                                    styleAttr,
                                    {
                                        identifier: 'componly-component-name',
                                        expression: {
                                            type: 'string',
                                            value: component.displayName
                                        }
                                    },
                                    {
                                        identifier: 'componly-component-designsystem',
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
                                            identifier: 'componly-component-uilib',
                                            expression: {
                                                type: 'string',
                                                value: component.uiLibrary
                                            }
                                        }
                                    ]
                                }

                                path.node.openingElement.attributes = [
                                    ...path.node.openingElement.attributes,
                                    ...attributes.map(attr => {
                                        return t.jsxAttribute(
                                            t.jsxIdentifier(attr.identifier),
                                            attr.expression.type === 'object' ?
                                                t.jsxExpressionContainer(
                                                    t.objectExpression(
                                                        attr.expression.properties.map(prop => {
                                                            return t.objectProperty(
                                                                t.identifier(prop.identifier),
                                                                t.stringLiteral(prop.value)
                                                            )
                                                        })
                                                    )
                                                ) : t.stringLiteral(attr.expression.value)
                                        )
                                    })

                                ];
                            } else {
                                let skip = false;
                                if (path.parentPath.type === 'ArrowFunctionExpression') {
                                    if (path.parentPath && path.parentPath.parentPath) {
                                        switch (path.parentPath.parentPath.type) {
                                            case 'VariableDeclarator':
                                                const parentComponent = components.find(c => c.displayName === path.parentPath.parentPath.node.id.name);
                                                if (parentComponent && parentComponent.designsystem) {
                                                    skip = true;
                                                }
                                                break;
                                        }
                                    }
                                }

                                if (path.parentPath.type === 'ReturnStatement') {
                                    // console.log(path.parentPath.parentPath.parentPath.node);
                                    if (path.parentPath && path.parentPath.parentPath && path.parentPath.parentPath.parentPath) {
                                        switch (path.parentPath.parentPath.parentPath.type) {
                                            case 'FunctionDeclaration':
                                                const parentComponent = components.find(c => c.displayName === path.parentPath.parentPath.parentPath.node.id.name);
                                                if (parentComponent && parentComponent.designsystem) {
                                                    skip = true;
                                                }
                                                break;
                                            case 'ClassMethod':
                                                const classDeclaration = path.parentPath.parentPath.parentPath.parentPath.parentPath.node;
                                                const superClass = classDeclaration.superClass;
                                                if (classDeclaration && superClass) {
                                                    const className = classDeclaration.id ? classDeclaration.id.name : null;
                                                    const superClassName = superClass.object ? superClass.object.name : null;
                                                    const superClassProperty = superClass.property ? superClass.property.name : null;
                                                    const parentComponent = components.find(c => c.displayName === className);
                                                    if (superClassName === 'React' && superClassProperty === 'Component' && parentComponent && parentComponent.designsystem) {
                                                        skip = true;
                                                    }
                                                }
                                                break;
                                        }
                                    }
                                }
                                if (!skip) {
                                    // let styleAttr = {
                                    //     identifier: 'style',
                                    //     expression: {
                                    //         type: 'object',
                                    //         properties: [
                                    //             {
                                    //                 identifier: 'border',
                                    //                 value: '1px solid red'
                                    //             }
                                    //         ]
                                    //     }
                                    // };
                                    // if (config.styles && config.styles.notdesignsystem) {
                                    //     styleAttr = {
                                    //         identifier: 'style',
                                    //         expression: {
                                    //             type: 'object',
                                    //             properties: Object.keys(config.styles.notdesignsystem).map(key => {
                                    //                 return {
                                    //                     identifier: key,
                                    //                     value: config.styles.notdesignsystem[key]
                                    //                 }
                                    //             })
                                    //         }
                                    //     };
                                    // }
                                    let attributes = [
                                        //styleAttr,
                                        {
                                            identifier: 'componly-component-name',
                                            expression: {
                                                type: 'string',
                                                value: component.displayName
                                            }
                                        },
                                        {
                                            identifier: 'componly-component-designsystem',
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
                                                identifier: 'componly-component-uilib',
                                                expression: {
                                                    type: 'string',
                                                    value: component.uiLibrary
                                                }
                                            }
                                        ]
                                    }

                                    path.node.openingElement.attributes = [
                                        ...path.node.openingElement.attributes,
                                        ...attributes.map(attr => {
                                            return t.jsxAttribute(
                                                t.jsxIdentifier(attr.identifier),
                                                attr.expression.type === 'object' ?
                                                    t.jsxExpressionContainer(
                                                        t.objectExpression(
                                                            attr.expression.properties.map(prop => {
                                                                return t.objectProperty(
                                                                    t.identifier(prop.identifier),
                                                                    t.stringLiteral(prop.value)
                                                                )
                                                            })
                                                        )
                                                    ) : t.stringLiteral(attr.expression.value)
                                            )
                                        })

                                    ];
                                }

                            }
                        }
                    }

                }
            },
            JSXFragment(path, fileinfo) {
                const parentType = path.parentPath.node.type;
                let componentDeclaratorType;
                let componentName;
                let component;
                let children = [];
                switch (parentType) {
                    case 'ReturnStatement':
                        componentDeclaratorType = path.parentPath.parentPath.parentPath.parentPath.node.type;
                        switch (componentDeclaratorType) {
                            case 'VariableDeclarator':
                                componentName = path.parentPath.parentPath.parentPath.parentPath.node.id.name;
                                break;
                        }
                        break;
                    case 'ArrowFunctionExpression':
                        componentDeclaratorType = path.parentPath.parentPath.node.type;
                        switch (componentDeclaratorType) {
                            case 'VariableDeclarator':
                                componentName = path.parentPath.parentPath.node.id.name;
                                break;
                        }
                        break;
                }
                if (componentName) {
                    component = components.find(c => c.displayName === componentName);
                    if (component) {
                        component.JSXFragment = true;
                        children = path.node.children.filter(c => c.type === 'JSXElement');
                        console.log('Fragment: ' + componentName + ' children: ' + children.length);
                        children = children.map(child => {
                            child.openingElement.attributes = [
                                ...child.openingElement.attributes,
                                t.jsxAttribute(
                                    t.jsxIdentifier('componly-component-designsystem'),
                                    t.stringLiteral(component.designsystem ? 'true' : 'false')
                                ),
                                t.jsxAttribute(
                                    t.jsxIdentifier('componly-component-name'),
                                    t.stringLiteral(component.displayName)
                                ),
                                t.jsxAttribute(
                                    t.jsxIdentifier('componly-component-uilib'),
                                    t.stringLiteral(component.uiLibrary)
                                )
                            ];
                            return child;
                        });
                        path.node.children = children;
                        path.replaceWith(
                            t.JSXFragment(
                                t.jsxOpeningFragment(),
                                t.jsxClosingFragment(),
                                children
                            )
                        );
                        path.skip();
                    }
                }
            }
        }
    }
}

module.exports = ApplyDesignSystemPropsPlugin;
