'use strict';

var _ = require('lodash');
var ApiError = require('../../helpers/apiError');

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class SignaturesController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function SignaturesController (scope) {
	modules = scope.modules;
}

SignaturesController.postSignatures = function (context, next) {

	var signatures = context.request.swagger.params.signatures.value;

	modules.signatures.shared.postSignatures(signatures, function (err, data) {

		if(err) {
			if(err instanceof ApiError){
				context.statusCode = err.code;
				delete err.code;
			}
			return next(err);
		}

		next(null, {
			data: {message: data.status},
			meta: {status: true}
		});
	});
};

module.exports = SignaturesController;
