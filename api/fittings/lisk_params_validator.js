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

var _ = require('lodash');
var debug = require('debug')('swagger:lisk:params_validator');

/**
 * Description of the function.
 *
 * @func create_params_validator
 * @memberof api.fittings
 * @requires debug
 * @requires lodash
 * @param {Object} fittingDef
 * @param {Object} bagpipes
 * @returns {function} {@link api.fittings.lisk_params_validator}
 * @todo Add description for the function and the params
 */
module.exports = function create() {
	/**
	 * Description of the function.
	 *
	 * @func lisk_params_validator
	 * @memberof api.fittings
	 * @param {Object} context
	 * @param {function} cb
	 * @todo Add description for the function and the params
	 */
	return function lisk_params_validator(context, cb) {
		var error = null;

		// TODO: Add support for validating accept header against produces declarations
		// See: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
		//
		// var accept = req.headers['accept'];
		// var produces = _.union(operation.api.definition.produces, operation.definition.produces);

		if (context.request.swagger.operation) {
			var validateResult = context.request.swagger.operation.validateRequest(
				context.request
			);

			if (validateResult.errors.length) {
				error = new Error('Validation errors');
				error.statusCode = 400;

				validateResult.errors.forEach(error => {
					debug('param error: %j', error);
				});

				error.errors = _.map(validateResult.errors, e => {
					var errors = _.pick(e, ['code', 'message', 'in', 'name', 'errors']);
					errors.errors = _.map(e.errors, e =>
						_.pick(e, ['code', 'message', 'path'])
					);
					return errors;
				});
			}
		} else {
			error = new Error(
				'Invalid swagger operation, unable to validate response'
			);
		}

		cb(error);
	};
};
