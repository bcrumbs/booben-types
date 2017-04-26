/**
 * @author Dmitriy Bizyaev
 */

'use strict';

const _mapValues = require('lodash.mapvalues');
const { TypeNames, isBuiltinType, isNullableType } = require('./builtin-types');

const {
  isNumber,
  isInteger,
  isBoolean,
  isString,
  returnTrue,
  returnFalse,
  returnNull,
  returnArg,
  hasOwnProperty,
} = require('./utils');

/**
 *
 * @param {OneOfOption[]} options1
 * @param {OneOfOption[]} options2
 * @return {boolean}
 */
const oneOfOptionsAreEqual = (options1, options2) => {
  if (options1.length !== options2.length) return false;
  
  return options1.every(option1 =>
    !!options2.find(option2 => option2.value === option1.value));
};

/* eslint-disable quote-props, no-use-before-define */
const TYPES = {
  [TypeNames.STRING]: {
    validate: isString,
    print: () => 'string',
    isEqualType: returnTrue,
    isCompatibleType: (_, typedef2) =>
      typedef2.type === TypeNames.STRING ||
      typedef2.type === TypeNames.INT ||
      typedef2.type === TypeNames.FLOAT,
    
    makeDefaultValue: () => '',
    coerce: {
      [TypeNames.STRING]: returnArg,
      [TypeNames.INT]: value => String(value),
      [TypeNames.FLOAT]: value => String(value),
    },
  },
  
  [TypeNames.BOOL]: {
    validate: isBoolean,
    print: () => 'bool',
    isEqualType: returnTrue,
    isCompatibleType: (_, typedef2) =>
      typedef2.type === TypeNames.BOOL ||
      typedef2.type === TypeNames.STRING ||
      typedef2.type === TypeNames.INT ||
      typedef2.type === TypeNames.FLOAT,
    
    makeDefaultValue: () => false,
    coerce: {
      [TypeNames.BOOL]: returnArg,
      [TypeNames.STRING]: value => value.length !== 0,
      [TypeNames.INT]: value => value !== 0,
      [TypeNames.FLOAT]: value => value !== 0,
    },
  },
  
  [TypeNames.INT]: {
    validate: isInteger,
    print: () => 'int',
    isEqualType: returnTrue,
    isCompatibleType: (_, typedef2) => typedef2.type === TypeNames.INT,
    makeDefaultValue: () => 0,
    coerce: {
      [TypeNames.INT]: returnArg,
    },
  },
  
  [TypeNames.FLOAT]: {
    validate: isNumber,
    print: () => 'float',
    isEqualType: returnTrue,
    isCompatibleType: (_, typedef2) =>
      typedef2.type === TypeNames.FLOAT ||
      typedef2.type === TypeNames.INT,
    
    makeDefaultValue: () => 0,
    coerce: {
      [TypeNames.FLOAT]: returnArg,
      [TypeNames.INT]: returnArg,
    },
  },
  
  [TypeNames.SCALAR]: {
    validate: value => isNumber(value) || isBoolean(value) || isString(value),
    print: typedef => typedef.name ? `scalar(${typedef.name})` : 'scalar',
    isEqualType: (typedef1, typedef2) => typedef1.name === typedef2.name,
    isCompatibleType: (typedef1, typedef2) =>
      typedef2.type === TypeNames.SCALAR &&
      typedef2.name === typedef1.name,
    
    makeDefaultValue: () => '',
    coerce: {
      [TypeNames.SCALAR]: returnArg,
    },
  },
  
  [TypeNames.ONE_OF]: {
    validate: (value, typedef) =>
      typedef.options.some(option => option.value === value),
    
    print: typedef => {
      const options = typedef.options
        .map(({ value }) => JSON.stringify(value))
        .join(', ');
      
      return `oneOf(${options})`;
    },
    
    isEqualType: (typedef1, typedef2) => oneOfOptionsAreEqual(
      typedef1.options,
      typedef2.options
    ),
    
    isCompatibleType: (typedef1, typedef2) =>
      typedef2.type === TypeNames.ONE_OF &&
      oneOfOptionsAreEqual(
        typedef1.options,
        typedef2.options
      ),
    
    makeDefaultValue: typedef => typedef.options[0].value,
    coerce: {
      [TypeNames.ONE_OF]: returnArg,
    },
  },
  
  [TypeNames.ARRAY]: {
    validate: value => Array.isArray(value),
    print: () => 'array',
    isEqualType: returnTrue,
    isCompatibleType: (_, typedef2) =>
      typedef2.type === TypeNames.ARRAY ||
      typedef2.type === TypeNames.ARRAY_OF,
    
    makeDefaultValue: () => [],
    coerce: {
      [TypeNames.ARRAY]: returnArg,
      [TypeNames.ARRAY_OF]: returnArg,
    },
  },
  
  [TypeNames.ARRAY_OF]: {
    validate: (value, typedef, userTypedefs) =>
    Array.isArray(value) && value.every(item =>
      isValidValue(item, typedef.ofType, userTypedefs)),
    
    print: (typedef, userTypedefs) =>
      `arrayOf(${printType(typedef.ofType, userTypedefs)})`,
    
    isEqualType: (typedef1, typedef2, userTypedefs1, userTypedefs2) =>
      isEqualType(
        typedef1.ofType,
        typedef2.ofType,
        userTypedefs1,
        userTypedefs2
      ),
    
    isCompatibleType: (typedef1, typedef2, userTypedefs1, userTypedefs2) =>
      typedef2.type === TypeNames.ARRAY_OF &&
      isCompatibleType(
        typedef1.ofType,
        typedef2.ofType,
        userTypedefs1,
        userTypedefs2
      ),
    
    makeDefaultValue: () => [],
    coerce: {
      [TypeNames.ARRAY_OF]: (
          value,
          typedefFrom,
          typedefTo,
          userTypedefsFrom,
          userTypedefsTo
        ) => value.map(item => coerceValue(
          item,
          typedefFrom.ofType,
          typedefTo.ofType,
          userTypedefsFrom,
          userTypedefsTo
        )),
    },
  },
  
  [TypeNames.OBJECT]: {
    validate: (value, typedef) =>
      typeof value === 'object' && (!typedef.notNull || value !== null),
    
    print: () => 'object',
    
    isEqualType: (typedef1, typedef2) =>
      typedef1.notNull === typedef2.notNull,
    
    isCompatibleType: (typedef1, typedef2) =>
      (
        typedef2.type === TypeNames.OBJECT ||
        typedef2.type === TypeNames.OBJECT_OF ||
        typedef2.type === TypeNames.SHAPE
      ) && (
        typedef1.notNull
          ? typedef2.notNull
          : true
      ),
    
    makeDefaultValue: (typedef, _, options) =>
      (typedef.notNull || options.nonNull) ? null : {},
    
    coerce: {
      [TypeNames.OBJECT]: returnArg,
      [TypeNames.OBJECT_OF]: returnArg,
      [TypeNames.SHAPE]: returnArg,
    },
  },
  
  [TypeNames.OBJECT_OF]: {
    validate: (value, typedef, userTypedefs) =>
      typeof value === 'object' && (
        value === null
          ? !typedef.notNull
          : Object.keys(value).every(key =>
            isValidValue(value[key], typedef.ofType, userTypedefs))
      ),
    
    print: (typedef, userTypedefs) =>
      `objectOf(${printType(typedef.ofType, userTypedefs)})`,
    
    isEqualType: (typedef1, typedef2, userTypedefs1, userTypedefs2) =>
      typedef1.notNull === typedef2.notNull &&
      isEqualType(
        typedef1.ofType,
        typedef2.ofType,
        userTypedefs1,
        userTypedefs2
      ),
    
    isCompatibleType: (typedef1, typedef2, userTypedefs1, userTypedefs2) =>
      typedef2.type === TypeNames.OBJECT_OF &&
      isCompatibleType(
        typedef1.ofType,
        typedef2.ofType,
        userTypedefs1,
        userTypedefs2
      ) && (
        typedef1.notNull
          ? typedef2.notNull
          : true
      ),
    
    makeDefaultValue: (typedef, _, options) =>
      (typedef.notNull || options.nonNull) ? null : {},
    
    coerce: {
      [TypeNames.OBJECT_OF]: (
        value,
        typedefFrom,
        typedefTo,
        userTypedefsFrom,
        userTypedefsTo
      ) => {
        if (value === null) return null;
        
        return _mapValues(value, item => coerceValue(
          item,
          typedefFrom.ofType,
          typedefTo.ofType,
          userTypedefsFrom,
          userTypedefsTo
        ));
      },
    },
  },
  
  [TypeNames.SHAPE]: {
    validate: (value, typedef, userTypedefs) => {
      if (typeof value !== 'object') return false;
      if (value === null) return !typedef.notNull;

      return Object.keys(typedef.fields).every(key => {
        const fieldTypedef = typedef.fields[key];
        const fieldValue = value[key];
        return typeof fieldValue !== 'undefined'
          ? isValidValue(fieldValue, fieldTypedef, userTypedefs)
          : !fieldTypedef.required;
      });
    },
    
    print: (typedef, userTypedefs) => {
      // TODO: Handle circular refs
      const structure = Object.keys(typedef.fields)
        .map(key => `${key}:${printType(typedef.fields[key], userTypedefs)}`)
        .join(', ');
      
      return `shape(${structure})`;
    },
    
    isEqualType: (typedef1, typedef2, userTypedefs1, userTypedefs2) => {
      if (typedef1.notNull !== typedef2.notNull) return false;
      
      const keys1 = Object.keys(typedef1.fields);
      const keys2 = Object.keys(typedef2.fields);
      
      if (keys1.length !== keys2.length) return false;
      
      return keys1.every(key => {
        if (!hasOwnProperty(typedef2, key)) return false;
        
        return _isEqualType(
          typedef1.fields[key],
          typedef2.fields[key],
          userTypedefs1,
          userTypedefs2,
          true
        );
      });
    },
    
    isCompatibleType: (typedef1, typedef2, userTypedefs1, userTypedefs2) => {
      if (typedef2.type !== TypeNames.SHAPE) return false;
      if (typedef1.notNull && !typedef2.notNull) return false;
      
      const keys1 = Object.keys(typedef1.fields);
      const keys2 = Object.keys(typedef2.fields);
      
      if (keys1.length !== keys2.length) return false;
      
      return keys1.every(key => {
        if (!hasOwnProperty(typedef2, key)) return false;
        
        return _isCompatibleType(
          typedef1.fields[key],
          typedef2.fields[key],
          userTypedefs1,
          userTypedefs2,
          true
        );
      });
    },
    
    makeDefaultValue: (typedef, userTypedefs, options) =>
      (typedef.notNull || options.nonNull)
        ? _mapValues(
          typedef.fields,
          fieldTypedef => _makeDefaultValue(
            fieldTypedef,
            userTypedefs,
            options.deepNonNull
              ? options
              : { nonNull: false, deepNonNull: false }
          )
        )
        : null,
    
    coerce: {
      [TypeNames.SHAPE]: (
        value,
        typedefFrom,
        typedefTo,
        userTypedefsFrom,
        userTypedefsTo
      ) => {
        if (value === null) return null;
        
        return _mapValues(typedefFrom.fields, (_, fieldName) => coerceValue(
          value[fieldName],
          typedefFrom.fields[fieldName],
          typedefTo.fields[fieldName],
          userTypedefsFrom,
          userTypedefsTo
        ));
      },
    },
  },
  
  [TypeNames.COMPONENT]: {
    validate: returnTrue, // TODO: Write validator for component-type value
    print: /* istanbul ignore next */ () => 'component',
    isEqualType: returnTrue,
    isCompatibleType: (_, typedef2) => typedef2.type === TypeNames.COMPONENT,
    makeDefaultValue: returnNull,
    coerce: {},
  },
  
  [TypeNames.FUNC]: {
    validate: returnTrue, // TODO: Write validator for func-type value
    print: /* istanbul ignore next */ () => 'func',
    isEqualType: returnFalse, // TODO: Write actual checker
    isCompatibleType: returnFalse, // TODO: Write actual checker
    makeDefaultValue: returnNull,
    coerce: {},
  },
};
/* eslint-enable quote-props, no-use-before-define */

/**
 *
 * @param {JssyTypeDefinition} typedef
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs=null]
 * @returns {?JssyTypeDefinition}
 */
const resolveTypedef = (typedef, userTypedefs = null) => {
  if (isBuiltinType(typedef.type)) return typedef;
  
  return (userTypedefs && userTypedefs[typedef.type])
    ? Object.assign({}, typedef, userTypedefs[typedef.type])
    : null;
};

/**
 *
 * @param {*} value
 * @param {JssyTypeDefinition} typedef
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs=null]
 * @return {boolean}
 */
const isValidValue = (value, typedef, userTypedefs = null) => {
  const resolvedTypedef = resolveTypedef(typedef, userTypedefs);
  
  if (!resolvedTypedef)
    throw new Error(`Cannot resolve type '${typedef.type}'`);
  
  return TYPES[resolvedTypedef.type].validate(
    value,
    resolvedTypedef,
    userTypedefs
  );
};

/**
 *
 * @param {JssyTypeDefinition} typedef
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs=null]
 * @return {string}
 */
const printType = (typedef, userTypedefs = null) => {
  const resolvedTypedef = resolveTypedef(typedef, userTypedefs);
  
  if (!resolvedTypedef)
    throw new Error(`Cannot resolve type '${typedef.type}'`);
  
  return TYPES[resolvedTypedef.type].print(resolvedTypedef, userTypedefs);
};

/**
 *
 * @param {JssyTypeDefinition} typedef1
 * @param {JssyTypeDefinition} typedef2
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs1=null]
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs2=null]
 * @param {boolean} [checkRequired=false]
 * @return {boolean}
 */
const _isEqualType = (
  typedef1,
  typedef2,
  userTypedefs1 = null,
  userTypedefs2 = null,
  checkRequired = false
) => {
  const resolvedTypedef1 = resolveTypedef(typedef1, userTypedefs1);
  
  if (!resolvedTypedef1)
    throw new Error(`Cannot resolve type '${typedef1.type}'`);
  
  const resolvedTypedef2 = resolveTypedef(typedef2, userTypedefs2);
  
  if (!resolvedTypedef2)
    throw new Error(`Cannot resolve type '${typedef2.type}'`);
  
  if (resolvedTypedef1.type !== resolvedTypedef2.type) return false;

  if (
    checkRequired &&
    (!!resolvedTypedef1.required !== !!resolvedTypedef2.required)
  )
    return false;
  
  return TYPES[resolvedTypedef1.type].isEqualType(
    resolvedTypedef1,
    resolvedTypedef2,
    userTypedefs1,
    userTypedefs2
  );
};

/**
 *
 * @param {JssyTypeDefinition} typedef1
 * @param {JssyTypeDefinition} typedef2
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs1=null]
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs2=null]
 * @return {boolean}
 */
const isEqualType = (
  typedef1,
  typedef2,
  userTypedefs1 = null,
  userTypedefs2 = null
) => _isEqualType(
  typedef1,
  typedef2,
  userTypedefs1,
  userTypedefs2
);

/**
 *
 * @param {JssyTypeDefinition} typedef1
 * @param {JssyTypeDefinition} typedef2
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs1=null]
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs2=null]
 * @param {boolean} [checkRequired=false]
 * @return {boolean}
 */
const _isCompatibleType = (
  typedef1,
  typedef2,
  userTypedefs1 = null,
  userTypedefs2 = null,
  checkRequired = false
) => {
  const resolvedTypedef1 = resolveTypedef(typedef1, userTypedefs1);
  
  if (!resolvedTypedef1)
    throw new Error(`Cannot resolve type '${typedef1.type}'`);
  
  const resolvedTypedef2 = resolveTypedef(typedef2, userTypedefs2);
  
  if (!resolvedTypedef2)
    throw new Error(`Cannot resolve type '${typedef2.type}'`);

  if (
    checkRequired &&
    !!resolvedTypedef1.required &&
    !resolvedTypedef2.required
  )
    return false;
  
  return TYPES[resolvedTypedef1.type].isCompatibleType(
    resolvedTypedef1,
    resolvedTypedef2,
    userTypedefs1,
    userTypedefs2
  );
};

/**
 *
 * @param {JssyTypeDefinition} typedef1
 * @param {JssyTypeDefinition} typedef2
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs1=null]
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs2=null]
 * @return {boolean}
 */
const isCompatibleType = (
  typedef1,
  typedef2,
  userTypedefs1 = null,
  userTypedefs2 = null
) => _isCompatibleType(
  typedef1,
  typedef2,
  userTypedefs1,
  userTypedefs2
);

/**
 *
 * @param {JssyTypeDefinition} typedef
 * @param {(string|number)[]} valuePath
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs=null]
 * @return {JssyTypeDefinition}
 */
const getNestedTypedef = (
  typedef,
  valuePath,
  userTypedefs = null
) => valuePath.reduce(
  (acc, cur) => {
    const resolvedTypedef = resolveTypedef(acc, userTypedefs);
    
    if (!resolvedTypedef)
      throw new Error(`getNestedTypedef(): Cannot resolve type '${acc.type}'`);
    
    if (typeof cur === 'string') {
      if (resolvedTypedef.type === TypeNames.OBJECT_OF) {
        return resolvedTypedef.ofType;
      } else if (resolvedTypedef.type === TypeNames.SHAPE) {
        return resolvedTypedef.fields[cur];
      } else {
        throw new Error(
          `getNestedTypedef(): incompatible type: ${resolvedTypedef.type}`
        );
      }
    } else if (typeof cur === 'number') {
      if (resolvedTypedef.type === TypeNames.ARRAY_OF) {
        return resolvedTypedef.ofType;
      } else {
        throw new Error(
          `getNestedTypedef(): incompatible type: ${resolvedTypedef.type}`
        );
      }
    } else {
      throw new Error(
        'getNestedTypedef(): valuePath can contain ' +
        `only numbers and strings, got ${cur}`
      );
    }
  },
  
  typedef
);

/**
 *
 * @param {JssyTypeDefinition} typedef
 * @param {Object<string, JssyTypeDefinition>} userTypedefs
 * @param {Object} options
 * @param {boolean} options.nonNull
 * @param {boolean} options.deepNonNull
 * @return {*}
 */
const _makeDefaultValue = (typedef, userTypedefs, options) => {
  const resolvedTypedef = resolveTypedef(typedef, userTypedefs);
  
  if (!resolvedTypedef)
    throw new Error(`Cannot resolve type '${typedef.type}'`);
  
  return TYPES[resolvedTypedef.type].makeDefaultValue(
    typedef,
    userTypedefs,
    options
  );
};

/**
 *
 * @param {JssyTypeDefinition} typedef
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs=null]
 * @return {*}
 */
const makeDefaultValue = (typedef, userTypedefs = null) =>
  _makeDefaultValue(typedef, userTypedefs, {
    nonNull: false,
    deepNonNull: false,
  });

/**
 *
 * @param {JssyTypeDefinition} typedef
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefs=null]
 * @return {*}
 */
const makeDefaultNonNullValue = (typedef, userTypedefs = null) =>
  _makeDefaultValue(typedef, userTypedefs, {
    nonNull: true,
    deepNonNull: false,
  });

/**
 *
 * @param {*} value
 * @param {JssyTypeDefinition} typedefFrom
 * @param {JssyTypeDefinition} typedefTo
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefsFrom=null]
 * @param {?Object<string, JssyTypeDefinition>} [userTypedefsTo=null]
 */
const coerceValue = (
  value,
  typedefFrom,
  typedefTo,
  userTypedefsFrom = null,
  userTypedefsTo = null
) => {
  const resolvedTypedefFrom = resolveTypedef(typedefFrom, userTypedefsFrom);
  
  if (!resolvedTypedefFrom)
    throw new Error(`Cannot resolve type '${typedefFrom.type}'`);
  
  const resolvedTypedefTo = resolveTypedef(typedefTo, userTypedefsTo);
  
  if (!resolvedTypedefTo)
    throw new Error(`Cannot resolve type '${typedefTo.type}'`);
  
  const coerceFn =
    TYPES[resolvedTypedefTo.type].coerce[resolvedTypedefFrom.type];
  
  if (!coerceFn) {
    throw new Error(
      `Cannot coerce '${resolvedTypedefFrom.type}' ` +
      `to '${resolvedTypedefTo.type}'`
    );
  }
  
  return coerceFn(
    value,
    resolvedTypedefFrom,
    resolvedTypedefTo,
    userTypedefsFrom,
    userTypedefsTo
  );
};

exports.TypeNames = TypeNames;
exports.isBuiltinType = isBuiltinType;
exports.isNullableType = isNullableType;
exports.resolveTypedef = resolveTypedef;
exports.getNestedTypedef = getNestedTypedef;
exports.isValidValue = isValidValue;
exports.printType = printType;
exports.isEqualType = isEqualType;
exports.isCompatibleType = isCompatibleType;
exports.makeDefaultValue = makeDefaultValue;
exports.makeDefaultNonNullValue = makeDefaultNonNullValue;
exports.coerceValue = coerceValue;
