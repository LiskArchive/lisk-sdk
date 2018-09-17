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

var ApiError = require('../../helpers/api_error');

// Private Fields
var modules;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @requires helpers/apiError
 * @param {Object} scope - App instance
 * @todo Add description of SignaturesController
 */
function SignaturesController(scope) {
	modules = scope.modules;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
SignaturesController.postSignature = function(context, next) {
	var signature = context.request.swagger.params.signature.value;

	modules.signatures.shared.postSignature(signature, (err, data) => {
		if (err) {
			if (err instanceof ApiError) {
				context.statusCode = err.code;
				delete err.code;
			}
			return next(err);
		}
		next(null, {
			data: { message: data.status },
			meta: { status: true },
		});
	});
};

module.exports = SignaturesController;
