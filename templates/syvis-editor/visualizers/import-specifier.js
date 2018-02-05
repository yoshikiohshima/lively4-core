const walkTree = require('../walkTree')

module.exports = (node) => {
  const haveEqualName = node.local.name === node.imported.name

  return [
    'span.importSpecifier',
    ['span.imported', walkTree(node.imported)],
    ['span.local', haveEqualName ? null : walkTree(node.local)],
  ]
}