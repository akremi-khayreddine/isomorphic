const { types: t } = require('@babel/core');
const { scan, getInstances, getConfig } = require('./plugin-utils');
const paths = {
    root: process.cwd()
};
async function addPropsToProjectComponents() {
    const config = await getConfig();
    let components = await scan(paths.root, config);
    const instances = getInstances(components);
    const getFunctionName = (node) => {
        return node.id.name;
    }
    const getClassName = (node) => {
        return node.id.name;
    }
    const getVariableName = (node) => {
        const variable = node.declarations.find(declaration => declaration.type === 'VariableDeclarator');
        return variable.id.name;
    }
    const getComponentNameFromExportDefault = (node) => {
        const type = node.declaration.type;
        switch (type) {
            case 'AssignmentExpression':
                return node.declaration.left.name;
            case 'Identifier':
                return node.declaration.name;
            case 'FunctionDeclaration':
                return getFunctionName(node.declaration);
            case 'ClassDeclaration':
                return getClassName(node.declaration);
        }
    }
    const getComponentNameFromExportNamed = (node) => {
        const type = node.declaration.type;
        switch (type) {
            case 'VariableDeclaration':
                return getVariableName(node)
            case 'FunctionDeclaration':
                return getFunctionName(node.declaration);
            case 'ClassDeclaration':
                return getClassName(node.declaration);
        }
    }
    const addPropsToComponentParams = (node) => {
        const variable = node.declarations.find(declaration => declaration.type === 'VariableDeclarator');
        const init = variable.init;
        const params = init.params;
        if (params) {
            if (params.length) {
                switch (params[0].type) {
                    case 'Identifier':
                        break;
                    case 'ObjectPattern':
                        params[0].properties = [
                            ...params[0].properties,
                            t.restElement(t.identifier('props'))
                        ];
                        break;
                }
            } else {

            }
        }
    }
    return {
        visitor: {
            ClassDeclaration(path, fileinfo) {
                if (path.parentPath.type === 'Program') {
                    let name = getClassName(path.node);
                    if (name) {
                        component = components.find(c => c.displayName === name);
                        component.visited = true;
                    }
                }
            },
            FunctionDeclaration(path, fileinfo) {
                if (path.parentPath.type === 'Program') {
                    let name = getFunctionName(path.node);
                    if (name) {
                        component = components.find(c => c.displayName === name);
                        component.visited = true;
                    }
                }
            },
            VariableDeclaration(path, fileinfo) {
                if (path.parentPath.type === 'Program') {
                    let name = getVariableName(path.node);
                    if (name) {
                        component = components.find(c => c.displayName === name);
                        component.visited = true;
                        addPropsToComponentParams(path.node);
                    }
                }
            },
            ExportDefaultDeclaration(path, fileinfo) {
                let name = getComponentNameFromExportDefault(path.node);
                let component;
                if (name) {
                    component = components.find(c => c.displayName === name);
                    if (component && !component.visited) {
                    }
                }
            },
            ExportNamedDeclaration(path, fileinfo) {
                let name = getComponentNameFromExportNamed(path.node);
                let component;
                if (name) {
                    component = components.find(c => c.displayName === name);
                }
            }
        }
    };
}

module.exports = addPropsToProjectComponents;