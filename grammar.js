/**
 * @file SystemRDL grammar for tree-sitter
 * @author Ayan Banerjee <ayanbanrj@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "systemrdl",

  word: ($) => $.id,

  extras: ($) => [
    /\s/,
    $.line_comment,
    $.block_comment,
    $.embedded_perl,
    $.preprocessor_directive,
    $.macro_usage,
  ],

  conflicts: ($) => [
    [$.component_anon_def],
    [$.component_named_def],
    [$.constant_expression],
    [$.explicit_component_inst, $.prop_assignment_lhs],
    [$.component_inst_array_or_range, $.instance_ref_element],
    [$.constant_multiple_concatenation, $.constant_primary],
  ],

  rules: {
    source_file: ($) => repeat($.description),

    // 4.2 Comments

    line_comment: ($) => /\/\/[^\n]*\n?/,

    block_comment: ($) => /\/\*([^*]|\*+[^/*])*\*+\//,

    // 16.1 Embedded Perl preprocessing

    embedded_perl: ($) => /<%([^%]|%+[^%>])*%+>/,

    // 16.2 Verilog-style preprocessor

    preprocessor_directive: ($) =>
      /`(define|include|line|undef|if|else|elsif|endif|ifdef|ifndef)(?:(?:[ \t]|\\\r?\n)[^\n]*)?/,

    macro_usage: ($) => /`[a-zA-Z_]\w*/,

    // B.1 SystemRDL source text

    description: ($) =>
      choice(
        $.component_def,
        $.enum_def,
        $.property_definition,
        $.struct_def,
        $.constraint_def,
        $.explicit_component_inst,
        $.property_assignment,
      ),

    // B.2 User-defined properties

    property_definition: ($) =>
      seq("property", field("name", $.id), "{", $.property_body, "}", ";"),
    property_body: ($) => repeat1($.property_attribute),

    property_attribute: ($) =>
      choice(
        $.property_type,
        $.property_usage,
        $.property_default,
        $.property_constraint,
      ),

    property_type: ($) =>
      seq("type", "=", $.property_data_type, optional($.array_type), ";"),

    property_data_type: ($) =>
      choice($.component_primary_type, "ref", "number", $.basic_data_type),

    property_usage: ($) => seq("component", "=", $.property_comp_types, ";"),

    property_comp_types: ($) =>
      seq($.property_comp_type, repeat(seq("|", $.property_comp_type))),

    property_comp_type: ($) => choice($.component_type, "constraint", "all"),

    property_default: ($) => seq("default", "=", $.constant_expression, ";"),

    property_constraint: ($) =>
      seq("constraint", "=", $.property_constraint_type, ";"),

    property_constraint_type: ($) => "componentwidth",

    // B.3 Component definition

    component_def: ($) =>
      choice(
        seq(
          $.component_named_def,
          $.component_inst_type,
          $.component_insts,
          ";",
        ),
        seq(
          $.component_anon_def,
          $.component_inst_type,
          $.component_insts,
          ";",
        ),
        seq($.component_named_def, optional($.component_insts), ";"),
        seq($.component_anon_def, $.component_insts, ";"),
        seq(
          $.component_inst_type,
          $.component_named_def,
          $.component_insts,
          ";",
        ),
        seq(
          $.component_inst_type,
          $.component_anon_def,
          $.component_insts,
          ";",
        ),
      ),

    component_named_def: ($) =>
      seq(
        field("type", $.component_type),
        field("name", $.id),
        optional(field("params", $.param_def)),
        repeat(
          seq(
            "{",
            field("type", $.component_type),
            field("name", $.id),
            optional(field("params", $.param_def)),
          ),
        ),
        field("body", $.component_body),
      ),

    component_anon_def: ($) =>
      seq(
        field("type", $.component_type),
        repeat(seq("{", field("type", $.component_type))),
        field("body", $.component_body),
      ),

    component_body: ($) => seq("{", repeat($.component_body_elem), "}"),

    component_body_elem: ($) =>
      choice(
        $.component_def,
        $.enum_def,
        $.struct_def,
        $.constraint_def,
        $.explicit_component_inst,
        $.property_assignment,
      ),

    component_type: ($) => choice($.component_primary_type, "signal"),

    component_primary_type: ($) =>
      choice("addrmap", "regfile", "reg", "field", "mem"),

    explicit_component_inst: ($) =>
      seq(
        optional($.component_inst_type),
        optional($.component_inst_alias),
        field("type_id", $.id),
        field("instances", $.component_insts),
        ";",
      ),

    component_insts: ($) =>
      seq(
        optional($.param_inst),
        $.component_inst,
        repeat(seq(",", $.component_inst)),
      ),

    component_inst: ($) =>
      choice(
        seq(
          field("name", $.id),
          optional(field("range", $.component_inst_array_or_range)),
          optional(seq("=", optional(field("reset", $.constant_expression)))),
          optional(seq("@", optional(field("address", $.constant_expression)))),
          optional(seq("+=", optional(field("stride", $.constant_expression)))),
          optional(
            seq("%=", optional(field("alignment", $.constant_expression))),
          ),
        ),
        seq(
          field("range", $.component_inst_array_or_range),
          optional(seq("=", optional(field("reset", $.constant_expression)))),
          optional(seq("@", optional(field("address", $.constant_expression)))),
          optional(seq("+=", optional(field("stride", $.constant_expression)))),
          optional(
            seq("%=", optional(field("alignment", $.constant_expression))),
          ),
        ),
        seq(
          seq("=", optional(field("reset", $.constant_expression))),
          optional(seq("@", optional(field("address", $.constant_expression)))),
          optional(seq("+=", optional(field("stride", $.constant_expression)))),
          optional(
            seq("%=", optional(field("alignment", $.constant_expression))),
          ),
        ),
        seq(
          seq("@", optional(field("address", $.constant_expression))),
          optional(seq("+=", optional(field("stride", $.constant_expression)))),
          optional(
            seq("%=", optional(field("alignment", $.constant_expression))),
          ),
        ),
        seq(
          seq("+=", optional(field("stride", $.constant_expression))),
          optional(
            seq("%=", optional(field("alignment", $.constant_expression))),
          ),
        ),
        seq("%=", optional(field("alignment", $.constant_expression))),
      ),

    component_inst_alias: ($) => seq("alias", $.id),

    component_inst_type: ($) => choice("external", "internal"),

    component_inst_array_or_range: ($) => choice(repeat1($.array), $.range),

    // B.4 Struct definitions

    struct_def: ($) =>
      seq(
        optional("abstract"),
        "struct",
        field("name", $.id),
        optional(seq(":", field("base", $.id))),
        field("body", $.struct_body),
        ";",
      ),

    struct_body: ($) => seq("{", repeat($.struct_elem), "}"),

    struct_elem: ($) =>
      seq(
        field("type", $.struct_type),
        field("name", $.id),
        optional(field("array", $.array_type)),
        ";",
      ),

    struct_type: ($) => choice($.data_type, $.component_type),

    // B.5 Constraints

    constraint_def: ($) =>
      choice(
        seq("constraint", $.constraint_def_exp, ";"),
        seq("constraint", $.constraint_def_anon, ";"),
      ),

    constraint_def_exp: ($) =>
      seq(
        field("name", $.id),
        field("body", $.constraint_body),
        optional(field("instances", $.constraint_insts)),
      ),

    constraint_def_anon: ($) =>
      seq(
        field("body", $.constraint_body),
        field("instances", $.constraint_insts),
      ),

    constraint_insts: ($) => seq($.id, repeat(seq(",", $.id))),

    constraint_body: ($) => seq("{", repeat(seq($.constraint_elem, ";")), "}"),

    constraint_prop_assignment: ($) =>
      seq(field("lhs", $.id), "=", field("rhs", $.constant_expression)),

    constraint_elem: ($) =>
      choice(
        $.constant_expression,
        $.constraint_prop_assignment,
        seq(
          field("lhs", $.constraint_lhs),
          "inside",
          "{",
          field("rhs", $.constraint_values),
          "}",
        ),
        seq(field("lhs", $.constraint_lhs), "inside", field("rhs", $.id)),
      ),

    constraint_values: ($) =>
      seq($.constraint_value, repeat(seq(",", $.constraint_value))),

    constraint_value: ($) =>
      choice(
        $.constant_expression,
        seq("[", $.constant_expression, ":", $.constant_expression, "]"),
      ),

    constraint_lhs: ($) => choice("this", $.instance_ref),

    // B.6 Parameters

    param_def: ($) =>
      seq("#", "(", $.param_def_elem, repeat(seq(",", $.param_def_elem)), ")"),

    param_def_elem: ($) =>
      seq(
        field("type", $.data_type),
        field("name", $.id),
        optional(field("array", $.array_type)),
        optional(seq("=", optional(field("default", $.constant_expression)))),
      ),

    param_inst: ($) =>
      seq("#", "(", $.param_elem, repeat(seq(",", $.param_elem)), ")"),

    param_elem: ($) =>
      seq(".", field("name", $.id), "(", field("value", $.param_value), ")"),

    param_value: ($) => $.constant_expression,

    // B.7 Enums

    enum_def: ($) =>
      seq("enum", field("name", $.id), field("body", $.enum_body), ";"),

    enum_body: ($) => seq("{", repeat1($.enum_entry), "}"),

    enum_entry: ($) =>
      seq(
        field("name", $.id),
        optional(seq("=", optional(field("value", $.constant_expression)))),
        optional(field("properties", $.enum_property_assignment)),
        ";",
      ),

    enum_property_assignment: ($) =>
      seq("{", repeat(seq($.explicit_prop_assignment, ";")), "}"),

    // B.8 Property assignment

    property_assignment: ($) =>
      choice($.explicit_or_default_prop_assignment, $.post_prop_assignment),

    explicit_or_default_prop_assignment: ($) =>
      choice(
        seq(optional("default"), $.explicit_prop_modifier, ";"),
        seq(optional("default"), $.explicit_prop_assignment, ";"),
      ),

    explicit_prop_modifier: ($) =>
      seq(field("mod", $.prop_mod), field("name", $.id)),

    explicit_encode_assignment: ($) => seq("encode", "=", field("rhs", $.id)),

    explicit_prop_assignment: ($) =>
      choice(
        seq(
          field("lhs", $.prop_assignment_lhs),
          optional(seq("=", optional(field("rhs", $.prop_assignment_rhs)))),
        ),
        $.explicit_encode_assignment,
      ),

    post_encode_assignment: ($) =>
      seq(
        field("lhs", $.instance_ref),
        "->",
        "encode",
        "=",
        field("rhs", $.id),
      ),

    post_prop_assignment: ($) =>
      choice(
        seq(
          field("lhs", $.prop_ref),
          optional(seq("=", optional(field("rhs", $.prop_assignment_rhs)))),
          ";",
        ),
        seq($.post_encode_assignment, ";"),
      ),

    prop_mod: ($) =>
      choice("posedge", "negedge", "bothedge", "level", "nonsticky"),

    prop_assignment_lhs: ($) => choice($.prop_keyword, $.id),

    prop_keyword: ($) => choice("sw", "hw", "rclr", "rset", "woclr", "woset"),

    prop_assignment_rhs: ($) =>
      choice($.constant_expression, $.precedencetype_literal),

    // B.9 Struct literal

    struct_literal: ($) =>
      seq($.id, "'{", optional($.struct_literal_body), "}"),

    struct_literal_body: ($) =>
      seq($.struct_literal_elem, repeat(seq(",", $.struct_literal_elem))),

    struct_literal_elem: ($) =>
      seq(field("name", $.id), ":", field("value", $.constant_expression)),

    // B.10 Array literal

    array_literal: ($) => seq("'{", $.array_literal_body, "}"),

    array_literal_body: ($) =>
      seq($.constant_expression, repeat(seq(",", $.constant_expression))),

    // B.11 Reference

    instance_ref: ($) =>
      seq($.instance_ref_element, repeat(seq(".", $.instance_ref_element))),

    prop_ref: ($) =>
      choice(
        seq(
          field("instance", $.instance_ref),
          "->",
          field("prop", $.prop_keyword),
        ),
        seq(field("instance", $.instance_ref), "->", field("prop", $.id)),
      ),

    instance_or_prop_ref: ($) =>
      choice(
        seq(
          field("instance", $.instance_ref),
          "->",
          field("prop", $.prop_keyword),
        ),
        seq(field("instance", $.instance_ref), "->", field("prop", $.id)),
        $.instance_ref,
      ),

    instance_ref_element: ($) =>
      seq(field("name", $.id), repeat(field("array", $.array))),

    // B.12 Array and range

    range: ($) =>
      seq(
        "[",
        optional(field("msb", $.constant_expression)),
        ":",
        optional(field("lsb", $.constant_expression)),
        "]",
      ),

    array: ($) => seq("[", optional(field("size", $.constant_expression)), "]"),

    array_type: ($) => seq("[", "]"),

    // B.13 Concatenation

    constant_concatenation: ($) =>
      seq(
        "{",
        $.constant_expression,
        repeat(seq(",", $.constant_expression)),
        "}",
      ),

    constant_multiple_concatenation: ($) =>
      seq("{", optional($.constant_expression), $.constant_concatenation, "}"),

    // B.14 Data types

    integer_type: ($) => choice($.integer_vector_type, $.integer_atom_type),

    integer_atom_type: ($) => "longint",

    integer_vector_type: ($) => "bit",

    simple_type: ($) => $.integer_type,

    signing: ($) => "unsigned",

    basic_data_type: ($) =>
      choice(
        seq($.simple_type, optional($.signing)),
        "string",
        "boolean",
        $.id,
      ),

    data_type: ($) =>
      choice(
        $.basic_data_type,
        "accesstype",
        "addressingtype",
        "onreadtype",
        "onwritetype",
      ),

    // B.15 Literals

    boolean_literal: ($) => choice("true", "false"),

    number: ($) =>
      token(
        choice(
          /[0-9][0-9_]*/,
          /0[xX][0-9a-fA-F_]*/,
          /[0-9]*'[dD][0-9_]*/,
          /[0-9]*'[hH][0-9a-fA-F_]*/,
          /[0-9]*'[bB][01_]*/,
        ),
      ),

    string_literal: ($) => token(/"([^"\\]|\\.)*"/),

    enumerator_literal: ($) => seq($.id, "::", $.id),

    accesstype_literal: ($) => choice("na", "rw", "wr", "r", "w", "rw1", "w1"),

    onreadtype_literal: ($) => choice("rclr", "rset", "ruser"),

    onwritetype_literal: ($) =>
      choice(
        "woset",
        "woclr",
        "wot",
        "wzs",
        "wzc",
        "wzt",
        "wclr",
        "wset",
        "wuser",
      ),

    addressingtype_literal: ($) => choice("compact", "regalign", "fullalign"),

    precedencetype_literal: ($) => choice("hw", "sw"),

    // B.16 Expressions

    constant_expression: ($) =>
      choice(
        $.constant_primary,
        prec(11, seq($.unary_operator, optional($.constant_primary))),
        prec.left(
          10,
          seq($.constant_expression, "**", optional($.constant_expression)),
        ),
        prec.left(
          9,
          seq(
            $.constant_expression,
            choice("*", "/", "%"),
            optional($.constant_expression),
          ),
        ),
        prec.left(
          8,
          seq(
            $.constant_expression,
            choice("+", "-"),
            optional($.constant_expression),
          ),
        ),
        prec.left(
          7,
          seq(
            $.constant_expression,
            choice("<<", ">>"),
            optional($.constant_expression),
          ),
        ),
        prec.left(
          6,
          seq(
            $.constant_expression,
            choice("<", "<=", ">", ">="),
            optional($.constant_expression),
          ),
        ),
        prec.left(
          5,
          seq(
            $.constant_expression,
            choice("==", "!="),
            optional($.constant_expression),
          ),
        ),
        prec.left(
          4,
          seq($.constant_expression, "&", optional($.constant_expression)),
        ),
        prec.left(
          3,
          seq(
            $.constant_expression,
            choice("^", "~^", "^~"),
            optional($.constant_expression),
          ),
        ),
        prec.left(
          2,
          seq($.constant_expression, "|", optional($.constant_expression)),
        ),
        prec.left(
          1,
          seq($.constant_expression, "&&", optional($.constant_expression)),
        ),
        prec.left(
          0,
          seq($.constant_expression, "||", optional($.constant_expression)),
        ),
        prec.right(
          -1,
          seq(
            $.constant_expression,
            "?",
            $.constant_expression,
            ":",
            $.constant_expression,
          ),
        ),
      ),

    constant_primary: ($) =>
      choice(
        $.primary_literal,
        $.constant_concatenation,
        $.constant_multiple_concatenation,
        seq("(", $.constant_expression, ")"),
        $.constant_cast,
        $.instance_or_prop_ref,
        $.struct_literal,
        $.array_literal,
      ),

    primary_literal: ($) =>
      choice(
        $.number,
        $.string_literal,
        $.boolean_literal,
        $.accesstype_literal,
        $.onreadtype_literal,
        $.onwritetype_literal,
        $.addressingtype_literal,
        $.enumerator_literal,
        "this",
      ),

    unary_operator: ($) =>
      choice("!", "+", "-", "~", "&", "~&", "|", "~|", "^", "~^", "^~"),

    constant_cast: ($) =>
      seq($.casting_type, "'", "(", $.constant_expression, ")"),

    casting_type: ($) => choice($.simple_type, $.constant_primary, "boolean"),

    // B.17 Identifiers

    id: ($) => token(/\\?[a-zA-Z_]\w*/),
  },
});
