'use strict';

/**
 *
 * @param {*} value
 * @return {boolean}
 */
exports.isNumber = value => typeof value === 'number' && isFinite(value);

/**
 *
 * @param {*} value
 * @return {boolean}
 */
exports.isInteger = value => exports.isNumber(value) && value % 1 === 0;

/**
 *
 * @param {*} value
 * @return {boolean}
 */
exports.isBoolean = value => typeof value === 'boolean';

/**
 *
 * @param {*} value
 * @return {boolean}
 */
exports.isString = value => typeof value === 'string';

/**
 *
 * @return {boolean}
 */
exports.returnTrue = /* istanbul ignore next */ () => true;

/**
 *
 * @return {boolean}
 */
exports.returnFalse = /* istanbul ignore next */ () => false;

/**
 *
 * @return {null}
 */
exports.returnNull = /* istanbul ignore next */ () => null;

/**
 *
 * @param {*} arg
 * @return {*}
 */
exports.returnArg = /* istanbul ignore next */ arg => arg;

/**
 *
 * @param {Object} object
 * @param {string} key
 * @return {boolean}
 */
exports.hasOwnProperty = /* istanbul ignore next */ (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

/**
 *
 * @param {Object} object
 * @param {Function} keyFn
 * @param {Function} valueFn
 * @return {Object}
 */
exports.objectToObject = (object, keyFn, valueFn) => {
  const ret = {};
  
  Object.keys(object).forEach(key => {
    ret[keyFn(object[key], key, object)] = valueFn(object[key], key, object);
  });
  
  return ret;
};
