/**
 * @author Dmitriy Bizyaev
 */

'use strict';

/**
 *
 * @param {*} value
 * @return {boolean}
 */
exports.isNumber = value => typeof value === 'number' && isFinite(value);

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
