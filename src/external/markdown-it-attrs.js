(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.markdownItAttrs = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

const patterns = require('./patterns.js');

module.exports = function attributes(md) {

  function curlyAttrs(state) {
    let tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      for (let p = 0; p < patterns.length; p++) {
        let pattern = patterns[p];
        let j = null; // position of child with offset 0
        let match = pattern.tests.every(t => {
          let res = test(tokens, i, t);
          if (res.j !== null) { j = res.j; }
          return res.match;
        });
        if (match) {
          pattern.transform(tokens, i, j);
          if (pattern.name === 'inline attributes' || pattern.name === 'inline nesting 0') {
            // retry, may be several inline attributes
            p--;
          }
        }
      }
    }
  }

  md.core.ruler.before('linkify', 'curly_attributes', curlyAttrs);
};

/**
 * Test if t matches token stream.
 *
 * @param {array} tokens
 * @param {number} i
 * @param {object} t Test to match.
 * @return {object} { match: true|false, j: null|number }
 */
function test(tokens, i, t) {
  let res = {
    match: false,
    j: null  // position of child
  };

  let ii = t.shift !== undefined
    ? i + t.shift
    : t.position;
  let token = get(tokens, ii);  // supports negative ii


  if (token === undefined) { return res; }

  for (let key in t) {
    if (key === 'shift' || key === 'position') { continue; }

    if (token[key] === undefined) { return res; }

    if (key === 'children' && isArrayOfObjects(t.children)) {
      if (token.children.length === 0) {
        return res;
      }
      let match;
      let childTests = t.children;
      let children = token.children;
      if (childTests.every(tt => tt.position !== undefined)) {
        // positions instead of shifts, do not loop all children
        match = childTests.every(tt => test(children, tt.position, tt).match);
        if (match) {
          // we may need position of child in transform
          let j = last(childTests).position;
          res.j = j >= 0 ? j : children.length + j;
        }
      } else {
        for (let j = 0; j < children.length; j++) {
          match = childTests.every(tt => test(children, j, tt).match);
          if (match) {
            res.j = j;
            // all tests true, continue with next key of pattern t
            break;
          }
        }
      }

      if (match === false) { return res; }

      continue;
    }

    switch (typeof t[key]) {
    case 'boolean':
    case 'number':
    case 'string':
      if (token[key] !== t[key]) { return res; }
      break;
    case 'function':
      if (!t[key](token[key])) { return res; }
      break;
    case 'object':
      if (isArrayOfFunctions(t[key])) {
        let r = t[key].every(tt => tt(token[key]));
        if (r === false) { return res; }
        break;
      }
    // fall through for objects !== arrays of functions
    default:
      throw new Error(`Unknown type of pattern test (key: ${key}). Test should be of type boolean, number, string, function or array of functions.`);
    }
  }

  // no tests returned false -> all tests returns true
  res.match = true;
  return res;
}

function isArrayOfObjects(arr) {
  return Array.isArray(arr) && arr.length && arr.every(i => typeof i === 'object');
}

function isArrayOfFunctions(arr) {
  return Array.isArray(arr) && arr.length && arr.every(i => typeof i === 'function');
}

/**
 * Get n item of array. Supports negative n, where -1 is last
 * element in array.
 * @param {array} arr
 * @param {number} n
 */
function get(arr, n) {
  return n >= 0 ? arr[n] : arr[arr.length + n];
}

// get last element of array, safe - returns {} if not found
function last(arr) {
  return arr.slice(-1)[0] || {};
}

},{"./patterns.js":2}],2:[function(require,module,exports){
'use strict';
/**
 * If a pattern matches the token stream,
 * then run transform.
 */

const utils = require('./utils.js');

module.exports = [
  {
    /**
     * ```python {.cls}
     * for i in range(10):
     *     print(i)
     * ```
     */
    name: 'fenced code blocks',
    tests: [
      {
        shift: 0,
        block: true,
        info: utils.hasCurly('end')
      }
    ],
    transform: (tokens, i) => {
      let token = tokens[i];
      let start = token.info.lastIndexOf('{');
      let attrs = utils.getAttrs(token.info, start);
      utils.addAttrs(attrs, token);
      token.info = utils.removeCurly(token.info);
    }
  }, {
    /**
     * bla `click()`{.c} ![](img.png){.d}
     *
     * differs from 'inline attributes' as it does
     * not have a closing tag (nesting: -1)
     */
    name: 'inline nesting 0',
    tests: [
      {
        shift: 0,
        type: 'inline',
        children: [
          {
            shift: -1,
            type: (str) => str === 'image' || str === 'code_inline'
          }, {
            shift: 0,
            type: 'text',
            content: utils.hasCurly('start')
          }
        ]
      }
    ],
    transform: (tokens, i, j) => {
      let token = tokens[i].children[j];
      let endChar = token.content.indexOf('}');
      let attrToken = tokens[i].children[j - 1];
      let attrs = utils.getAttrs(token.content, 0);
      utils.addAttrs(attrs, attrToken);
      if (token.content.length === (endChar + 1)) {
        tokens[i].children.splice(j, 1);
      } else {
        token.content = token.content.slice(endChar + 1);
      }
    }
  }, {
    /**
     * | h1 |
     * | -- |
     * | c1 |
     * {.c}
     */
    name: 'tables',
    tests: [
      {
        // let this token be i, such that for-loop continues at
        // next token after tokens.splice
        shift: 0,
        type: 'table_close'
      }, {
        shift: 1,
        type: 'paragraph_open'
      }, {
        shift: 2,
        type: 'inline',
        content: utils.hasCurly('only')
      }
    ],
    transform: (tokens, i) => {
      let token = tokens[i + 2];
      let tableOpen = utils.getMatchingOpeningToken(tokens, i);
      let attrs = utils.getAttrs(token.content, 0);
      // add attributes
      utils.addAttrs(attrs, tableOpen);
      // remove <p>{.c}</p>
      tokens.splice(i + 1, 3);
    }
  }, {
    /**
     * *emphasis*{.with attrs=1}
     */
    name: 'inline attributes',
    tests: [
      {
        shift: 0,
        type: 'inline',
        children: [
          {
            shift: -1,
            nesting: -1  // closing inline tag, </em>{.a}
          }, {
            shift: 0,
            type: 'text',
            content: utils.hasCurly('start')
          }
        ]
      }
    ],
    transform: (tokens, i, j) => {
      let token = tokens[i].children[j];
      let content = token.content;
      let attrs = utils.getAttrs(content, 0);
      let openingToken = utils.getMatchingOpeningToken(tokens[i].children, j - 1);
      utils.addAttrs(attrs, openingToken);
      token.content = content.slice(content.indexOf('}') + 1);
    }
  }, {
    /**
     * - item
     * {.a}
     */
    name: 'list softbreak',
    tests: [
      {
        shift: -2,
        type: 'list_item_open'
      }, {
        shift: 0,
        type: 'inline',
        children: [
          {
            position: -2,
            type: 'softbreak'
          }, {
            position: -1,
            content: utils.hasCurly('only')
          }
        ]
      }
    ],
    transform: (tokens, i, j) => {
      let token = tokens[i].children[j];
      let content = token.content;
      let attrs = utils.getAttrs(content, 0);
      let ii = i - 2;
      while (tokens[ii - 1] &&
        tokens[ii - 1].type !== 'ordered_list_open' &&
        tokens[ii - 1].type !== 'bullet_list_open') { ii--; }
      utils.addAttrs(attrs, tokens[ii - 1]);
      tokens[i].children = tokens[i].children.slice(0, -2);
    }
  }, {
    /**
     * - nested list
     *   - with double \n
     *   {.a} <-- apply to nested ul
     *
     * {.b} <-- apply to root <ul>
     */
    name: 'list double softbreak',
    tests: [
      {
        // let this token be i = 0 so that we can erase
        // the <p>{.a}</p> tokens below
        shift: 0,
        type: (str) =>
          str === 'bullet_list_close' ||
          str === 'ordered_list_close'
      }, {
        shift: 1,
        type: 'paragraph_open'
      }, {
        shift: 2,
        type: 'inline',
        content: utils.hasCurly('only'),
        children: (arr) => arr.length === 1
      }, {
        shift: 3,
        type: 'paragraph_close'
      }
    ],
    transform: (tokens, i) => {
      let token = tokens[i + 2];
      let content = token.content;
      let attrs = utils.getAttrs(content, 0);
      let openingToken = utils.getMatchingOpeningToken(tokens, i);
      utils.addAttrs(attrs, openingToken);
      tokens.splice(i + 1, 3);
    }
  }, {
    /**
     * - end of {.list-item}
     */
    name: 'list item end',
    tests: [
      {
        shift: -2,
        type: 'list_item_open'
      }, {
        shift: 0,
        type: 'inline',
        children: [
          {
            position: -1,
            content: utils.hasCurly('end')
          }
        ]
      }
    ],
    transform: (tokens, i, j) => {
      let token = tokens[i].children[j];
      let content = token.content;
      let attrs = utils.getAttrs(content, content.lastIndexOf('{'));
      utils.addAttrs(attrs, tokens[i - 2]);
      let trimmed = content.slice(0, content.lastIndexOf('{'));
      token.content = last(trimmed) !== ' ' ?
        trimmed : trimmed.slice(0, -1);
    }
  }, {
    /**
     * something with softbreak
     * {.cls}
     */
    name: '\n{.a} softbreak then curly in start',
    tests: [
      {
        shift: 0,
        type: 'inline',
        children: [
          {
            position: -2,
            type: 'softbreak'
          }, {
            position: -1,
            type: 'text',
            content: utils.hasCurly('only')
          }
        ]
      }
    ],
    transform: (tokens, i, j) => {
      let token = tokens[i].children[j];
      let attrs = utils.getAttrs(token.content, 0);
      // find last closing tag
      let ii = i + 1;
      while (tokens[ii + 1] && tokens[ii + 1].nesting === -1) { ii++; }
      let openingToken = utils.getMatchingOpeningToken(tokens, ii);
      utils.addAttrs(attrs, openingToken);
      tokens[i].children = tokens[i].children.slice(0, -2);
    }
  }, {
    /**
     * end of {.block}
     */
    name: 'end of block',
    tests: [
      {
        shift: 0,
        type: 'inline',
        children: [
          {
            position: -1,
            content: utils.hasCurly('end'),
            type: (t) => t !== 'code_inline'
          }
        ]
      }
    ],
    transform: (tokens, i, j) => {
      let token = tokens[i].children[j];
      let content = token.content;
      let attrs = utils.getAttrs(content, content.lastIndexOf('{'));
      let ii = i + 1;
      while (tokens[ii + 1] && tokens[ii + 1].nesting === -1) { ii++; }
      let openingToken = utils.getMatchingOpeningToken(tokens, ii);
      utils.addAttrs(attrs, openingToken);
      let trimmed = content.slice(0, content.lastIndexOf('{'));
      token.content = last(trimmed) !== ' ' ?
        trimmed : trimmed.slice(0, -1);
    }
  }
];

// get last element of array or string
function last(arr) {
  return arr.slice(-1)[0];
}


},{"./utils.js":3}],3:[function(require,module,exports){
'use strict';
/**
 * parse {.class #id key=val} strings
 * @param {string} str: string to parse
 * @param {int} start: where to start parsing (including {)
 * @returns {2d array}: [['key', 'val'], ['class', 'red']]
 */
exports.getAttrs = function (str, start, end) {
  // TODO: do not require `end`, stop when } is found
  // not tab, line feed, form feed, space, solidus, greater than sign, quotation mark, apostrophe and equals sign
  const allowedKeyChars = /[^\t\n\f />"'=]/;
  const pairSeparator = ' ';
  const keySeparator = '=';
  const classChar = '.';
  const idChar = '#';
  const endChar = '}';

  const attrs = [];
  let key = '';
  let value = '';
  let parsingKey = true;
  let valueInsideQuotes = false;

  // read inside {}
  // start + 1 to avoid beginning {
  // breaks when } is found or end of string
  for (let i = start + 1; i < str.length; i++) {
    let char_ = str.charAt(i);
    if (char_ === endChar) {
      if (key !== '') { attrs.push([key, value]); }
      break;
    }

    // switch to reading value if equal sign
    if (char_ === keySeparator) {
      parsingKey = false;
      continue;
    }

    // {.class} {..css-module}
    if (char_ === classChar) {
      if (key === '') {
        key = 'class';
        parsingKey = false;
        continue;
      } else if (key === 'class') {
        key = 'css-module';
        continue;
      }
    }

    // {#id}
    if (char_ === idChar && key === '') {
      key = 'id';
      parsingKey = false;
      continue;
    }

    // {value="inside quotes"}
    if (char_ === '"' && value === '') {
      valueInsideQuotes = true;
      continue;
    }
    if (char_ === '"' && valueInsideQuotes) {
      valueInsideQuotes = false;
      continue;
    }

    // read next key/value pair
    if ((char_ === pairSeparator && !valueInsideQuotes) || i === end) {
      if (key === '') {
        // beginning or ending space: { .red } vs {.red}
        continue;
      }
      attrs.push([key, value]);
      key = '';
      value = '';
      parsingKey = true;
      continue;
    }

    // continue if character not allowed
    if (parsingKey && char_.search(allowedKeyChars) === -1) {
      continue;
    }

    // no other conditions met; append to key/value
    if (parsingKey) {
      key += char_;
      continue;
    }
    value += char_;
  }
  return attrs;
};

/**
 * add attributes from [['key', 'val']] list
 * @param {array} attrs: [['key', 'val']]
 * @param {token} token: which token to add attributes
 * @returns token
 */
exports.addAttrs = function (attrs, token) {
  for (let j = 0, l = attrs.length; j < l; ++j) {
    let key = attrs[j][0];
    if (key === 'class') {
      token.attrJoin('class', attrs[j][1]);
    } else if (key === 'css-module') {
      token.attrJoin('css-module', attrs[j][1]);
    } else {
      token.attrPush(attrs[j]);
    }
  }
  return token;
};

/**
 * Does string have properly formatted curly?
 *
 * start: '{.a} asdf'
 * middle: 'a{.b}c'
 * end: 'asdf {.a}'
 * only: '{.a}'
 *
 * @param {string} where to expect {} curly. start, middle, end or only.
 * @return {function(string)} Function which testes if string has curly.
 */
exports.hasCurly = function (where) {

  if (!where) {
    throw new Error('Parameter `where` not passed. Should be "start", "middle", "end" or "only".');
  }

  /**
   * @param {string} str
   * @return {boolean}
   */
  return function (str) {
    // we need minimum three chars, for example {b}
    let minCurlyLength = 3;
    if (!str || typeof str !== 'string' || str.length < minCurlyLength) {
      return false;
    }

    function validCurlyLength(curly) {
      let isClass = curly.charAt(1) === '.';
      let isId = curly.charAt(1) === '#';
      return (isClass || isId)
        ? curly.length >= (minCurlyLength + 1)
        : curly.length >= minCurlyLength;
    }

    let start, end;
    switch (where) {
    case 'start':
      // first char should be {, } found in char 2 or more
      start = str.charAt(0) === '{' ? 0 : -1;
      end = start === -1 ? -1 : str.indexOf('}', start + minCurlyLength - 1);
      break;

    case 'middle':
      // 'a{.b}'
      start = str.indexOf('{', 1);
      end = start === -1 ? -1 : str.indexOf('}', start + minCurlyLength - 1);
      break;

    case 'end':
      // last char should be }
      end = str.charAt(str.length - 1) === '}' ? str.length - 1 : -1;
      start = end === -1 ? -1 : str.lastIndexOf('{');
      break;

    case 'only':
      // '{.a}'
      start = str.charAt(0) === '{' ? 0 : -1;
      end = str.charAt(str.length - 1) === '}' ? str.length - 1 : -1;
      break;
    }

    return start !== -1 && end !== -1 && validCurlyLength(str.substring(start, end + 1));
  };
};

/**
 * Removes last curly from string.
 */
exports.removeCurly = function (str) {
  let curly = /[ \n]?{[^{}}]+}$/;
  let pos = str.search(curly);

  return pos !== -1 ? str.slice(0, pos) : str;
};

/**
 * find corresponding opening block
 */
exports.getMatchingOpeningToken = function (tokens, i) {
  if (tokens[i].type === 'softbreak') {
    return false;
  }
  // non closing blocks, example img
  if (tokens[i].nesting === 0) {
    return tokens[i];
  }

  // inline tokens changes level on same token
  // that have .nesting +- 1
  let level = tokens[i].block
    ? tokens[i].level
    : tokens[i].level + 1;  // adjust for inline tokens

  let type = tokens[i].type.replace('_close', '_open');

  for (; i >= 0; --i) {
    if (tokens[i].type === type && tokens[i].level === level) {
      return tokens[i];
    }
  }
};


/**
 * from https://github.com/markdown-it/markdown-it/blob/master/lib/common/utils.js
 */
let HTML_ESCAPE_TEST_RE = /[&<>"]/;
let HTML_ESCAPE_REPLACE_RE = /[&<>"]/g;
let HTML_REPLACEMENTS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
};

function replaceUnsafeChar(ch) {
  return HTML_REPLACEMENTS[ch];
}

exports.escapeHtml = function (str) {
  if (HTML_ESCAPE_TEST_RE.test(str)) {
    return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar);
  }
  return str;
};

},{}]},{},[1])(1)
});