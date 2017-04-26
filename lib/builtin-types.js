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
  SCALAR: 'scalar',
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

/**
 *
 * @type {Set<string>}
 */
const NULLABLE_TYPES = new Set([
  TypeNames.SHAPE,
  TypeNames.OBJECT,
  TypeNames.OBJECT_OF,
]);

/**
 *
 * @param {string} type
 * @return {boolean}
 */
const isNullableType = type => NULLABLE_TYPES.has(type);

exports.TypeNames = TypeNames;
exports.isBuiltinType = isBuiltinType;
exports.isNullableType = isNullableType;
