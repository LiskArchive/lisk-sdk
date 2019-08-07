/*
 * Copyright © 2019 Lisk Foundation
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

const _ = require('lodash');
const debug = require('debug')('swagger:lisk:params_validator');

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
		let error = null;

		// TODO: Add support for validating accept header against produces declarations
		// See: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
		//
		// var accept = req.headers['accept'];
		// var produces = _.union(operation.api.definition.produces, operation.definition.produces);

		if (context.request.swagger.operation) {
			const validateResult = context.request.swagger.operation.validateRequest(
				context.request,
			);

			if (validateResult.errors.length) {
				error = new Error('Validation errors');
				error.statusCode = 400;

				error.errors = _.map(validateResult.errors, validateResultErr => {
					const errors = _.pick(validateResultErr, [
						'code',
						'message',
						'in',
						'name',
						'errors',
					]);
					debug('param error: %j', validateResultErr);
					errors.errors = _.map(validateResultErr.errors, err2 =>
						_.pick(err2, ['code', 'message', 'path']),
					);
					return errors;
				});
			}
		} else {
			error = new Error(
				'Invalid swagger operation, unable to validate response',
			);
		}

		cb(error);
	};
};
