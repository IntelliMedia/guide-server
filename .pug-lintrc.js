module.exports = {                              // occurrence stats as of 2020-01-21
  // choose a reasonably popular/active lint configuration to start with
  // and then disable the rules that aren't required for the upgrade
  extends: "@debitoor/pug-lint-config-debitoor",
  disallowClassAttributeWithStaticValue: null,  // 1 occurrence
  disallowIdLiterals: null,                     // 3 occurrences
  disallowMultipleLineBreaks: null,             // 4 occurrences
  requireSpecificAttributes: null,              // 56 occurrences
  requireStrictEqualityOperators: null,         // 4 occurrences
  validateAttributeQuoteMarks: null,            // 43 occurrences
  validateAttributeSeparator: null,             // 150 occurrences
  validateDivTags: true,                        // 11 occurrences
  validateExtensions: null,                     // 59 occurrences
  validateIndentation: null                     // 62 occurrences
}
