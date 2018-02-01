/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

/**
 * Applies z_schema to validate schema.
 * @memberof module:helpers
 * @function z_schema-express
 * @param {function} z_schema
 * @return {function}
 */
module.exports = function(z_schema) {
	return function(req, res, next) {
		req.sanitize = sanitize;

		function sanitize(value, schema, callback) {
			return z_schema.validate(value, schema, (err, valid) =>
				callback(
					null,
					{
						isValid: valid,
						issues: err ? `${err[0].message}: ${err[0].path}` : null,
					},
					value
				)
			);
		}

		next();
	};
};
