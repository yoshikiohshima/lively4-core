import jsx from "babel-plugin-syntax-jsx";

export function element(tagName, attributes, children) {
  const tag = document.createElement(tagName);
  
  for (let [key, value] of Object.entries(attributes)) {
    tag.setAttribute(key, value);
  }
  
  return tag;
}

export function attributes(...attrs) {
  return Object.assign({}, ...attrs);
}

export function attributeStringLiteral(key, value) {
  return { [key]: value };
}

export function attributeEmpty(key) {
  return { [key]: key };
}

export function attributeExpression(key, value) {
  return { [key]: value.toString() };
}

export function children(children) {
  
}



function detectUnsupportedNodes(path, filename) {
  function gainPrintableFullPath(path) {
    let fullPath = [];
    
    while(path) {
      fullPath.unshift(path.node.type);
      path = path.parentPath;
    }
    
    return fullPath.map((nodeType, index) => '  '.repeat(index) + nodeType).join('\n');
  }
  
  path.traverse({
    /**
     * No support for JSXMemberExpression yet. #TODO: what are the semantics outside of react for this?
     * 
     * <foo.bar></foo.bar>
     */
    JSXMemberExpression(path, state) {
      throw new SyntaxError(`JSXMemberExpression not yet supported.
${gainPrintableFullPath(path)}`, filename, path.node.loc.start.line);
    },
    /**
     * No support for JSXSpreadAttribute yet.
     * 
     * let obj = { id: "myObj", class: "foo"};
     * <a {...obj}/>;
     */
    JSXSpreadAttribute(path, state) {
      throw new SyntaxError(`JSXSpreadAttribute not yet supported.
${gainPrintableFullPath(path)}`, filename, path.node.loc.start.line);
    },
    /**
     * No support for jSXNamespacedName yet.
     * 
     * <div ns:attr="val" />;
     */
    JSXNamespacedName(path, state) {
      throw new SyntaxError(`jSXNamespacedName not yet supported.
${gainPrintableFullPath(path)}`, filename, path.node.loc.start.line);
    }
  });
}

export default function ({ types: t, template, traverse }) {
  const GENERATED_IMPORT_IDENTIFIER = Symbol("generated import identifier");

  // #TODO: duplicate with aexpr transform -> extract it
  function addCustomTemplate(file, name) {
    let declar = file.declarations[name];
    if (declar) return declar;

    let identifier = file.declarations[name] = file.addImport("https://lively-kernel.org/lively4/lively4-core/src/external/babel-plugin-jsx-lively.js", name, name);
    identifier[GENERATED_IMPORT_IDENTIFIER] = true;
    return identifier;
  }
  
  return {
    inherits: jsx,
    visitor: {
      Program(path, state) {
        detectUnsupportedNodes(path, state && state.opts && state.opts.filename);
        
        function transformPath(path, programState) {
          function jSXAttributeToBuilder(path) {

            function getCallExpressionFor(functionName, ...additionalParameters) {
              return t.callExpression(
                addCustomTemplate(programState.file, functionName), // builder function
                [
                  t.stringLiteral(path.get("name").node.name), // key
                  ...additionalParameters
                ]
              );
            }
            
            let attributeValue = path.get("value");
            if(!path.node.value) {
              return getCallExpressionFor("attributeEmpty");
            } else if(attributeValue.isStringLiteral()) {
              return getCallExpressionFor("attributeStringLiteral", attributeValue.node);
            } else if(attributeValue.isJSXExpressionContainer()) {
              return getCallExpressionFor("attributeExpression", attributeValue.node.expression);
            } else if(attributeValue.isJSXElement()) {
              // #TODO: what would that even mean?
              throw new SyntaxError(`JSXElement as property value of JSXAttribute not yet supported.`);
            }

            throw new Error('unknown node type in JSXAttribute value ' + attributeValue.node.type);
          }
          
          function jSXChildrenToBuilder(child) {
            function getCallExpressionFor(functionName, ...additionalParameters) {
              return t.callExpression(
                addCustomTemplate(programState.file, functionName), // builder function
                [
                  t.stringLiteral(path.get("name").node.name), // key
                  ...additionalParameters
                ]
              );
            }
            
            if(child.isJSXText()) {
              return t.stringLiteral(child.node.value);
            }
            if(child.isJSXElement()) {
              return child.node;
            }
            if(child.isJSXElement()) {
              return child.node;
            }
            if(child.isJSXExpressionContainer()) {
              return child.get("expression").node;
            }
            return t.stringLiteral("Foo");
            
            if(child.isStringLiteral()) {
              return getCallExpressionFor("attributeStringLiteral", child.node);
            } else if(child.isJSXExpressionContainer()) {
              return getCallExpressionFor("attributeExpression", child.node.expression);
            } else if(child.isJSXSpreadChild()) {
              throw new SyntaxError(`JSXSpreadChild as child of JSXElement not yet supported.`);
            }
            throw new Error('unknown node type in JSXAttribute value ' + child.node.type);
          }
          
          
          path.traverse({
            JSXElement(path, state) {
              const jSXAttributes = path.get("openingElement").get("attributes");
              const jSXChildren = path.get("children");
              lively.notify(jSXChildren.length);
              
              let newNode = t.callExpression(
                addCustomTemplate(programState.file, "element"),
                [
                  t.stringLiteral(path.get("openingElement").get("name").node.name),
                  t.callExpression(
                    addCustomTemplate(programState.file, "attributes"),
                    jSXAttributes.map(jSXAttributeToBuilder)
                  ),
                  t.callExpression(
                    addCustomTemplate(programState.file, "children"),
                    jSXChildren.map(jSXChildrenToBuilder)
                  ),
                ]
              );

              path.replaceWith(newNode);
            },
            JSXExpressionContainer(path, state) {
              //path.replaceWith(path.expression);
            },
          })
          
          return path;
        }
        

        transformPath(path, state);
      },
        
      /*JSXText(path, state) {
        path.replaceWith(t.identifier(path.node.value + "$"))
      },
      
      JSXExpressionContainer(path, state) {
        path.replaceWith(path.node.expression);
      }*/
    }
  };
}
