const walkTree = require('../walkTree')

module.exports = node => {
  return [
    'section.code.if',
    ['header.test', walkTree(node.test)],
    ['div.consequent', node.consequent ? walkTree(node.consequent) : null],
    ['div.alternate', node.alternate ? walkTree(node.alternate) : null],
  ]
}