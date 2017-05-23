'use strict';

/**
 * Applies z_schema to validate schema.
 * @memberof module:helpers
 * @function z_schema-express
 * @param {function} z_schema
 * @return {function}
 */
module.exports = function (z_schema) {
	return function (req, res, next) {
		req.sanitize = sanitize;

		function sanitize (value, schema, callback) {
			return z_schema.validate(value, schema, function (err, valid) {
				return callback(null, {
					isValid: valid,
					issues: err ? err[0].message + ': ' + err[0].path : null
				}, value);
			});
		}

		next();
	};
};
