/**
 * @file SystemRDL grammar for tree-sitter
 * @author Ayan Banerjee <ayanbanrj@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "systemrdl",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
