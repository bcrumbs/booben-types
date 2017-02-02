/**
 * @author Dmitriy Bizyaev
 */

'use strict';

/**
 *
 * @type {Object<string, string>}
 */
const TypeNames = {
  STRING: 'string',
  BOOL: 'bool',
  INT: 'int',
  FLOAT: 'float',
  ONE_OF: 'oneOf',
  SHAPE: 'shape',
  OBJECT: 'object',
  OBJECT_OF: 'objectOf',
  ARRAY: 'array',
  ARRAY_OF: 'arrayOf',
  FUNC: 'func',
  COMPONENT: 'component',
};

/**
 *
 * @type {Set}
 */
const BUILTIN_TYPES =
  new Set(Object.keys(TypeNames).map(key => TypeNames[key]));

/**
 *
 * @param {string} typeName
 * @return {boolean}
 */
const isBuiltinType = typeName => BUILTIN_TYPES.has(typeName);

exports.TypeNames = TypeNames;
exports.isBuiltinType = isBuiltinType;
