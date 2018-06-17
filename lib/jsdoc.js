'use strict';

/**
 * @typedef {Object} OneOfOption
 * @property {string} [textKey]
 * @property {*} value
 */

/**
 * @typedef {Object} BoobenTypeDefinition
 * @property {string} type - Type name. Can be one of the built-in types or one of user-defined types.
 * @property {boolean} [notNull] - For "shape", "objectOf" and "object" types only.
 * @property {BoobenTypeDefinition} [ofType] - For "arrayOf" and "objectOf" types only - type of items.
 * @property {Object<string, BoobenTypeDefinition>} [fields] - For "shape" type only.
 * @property {OneOfOption[]} [options] - For "oneOf" type only.
 * @property {boolean} [required]
 */
