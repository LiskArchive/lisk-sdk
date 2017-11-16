'use strict';

var _ = require('lodash');

module.exports = function create (fittingDef, bagpipes) {

	return function lisk_params_validator (context, cb) {

		var error = null;

		// todo: add support for validating accept header against produces declarations
		// see: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
		//var accept = req.headers['accept'];
		//var produces = _.union(operation.api.definition.produces, operation.definition.produces);

		if (context.request.swagger.operation) {
			var validateResult = context.request.swagger.operation.validateRequest(context.request);
			if (validateResult.errors.length) {
				error = new Error('Validation errors');
				error.statusCode = 400;

				error.errors = _.map(validateResult.errors, function (e) {
					var errs = _.pick(e, ['code', 'message', 'in', 'name', 'errors']);
					errs.errors = _.map(e.errors, function (e){ return _.pick(e, ['code', 'message'] ); });
					return errs;
				});
			}
		} else {
			error = new Error('Not a swagger operation, will not validate response');
		}

		cb(error);
	};
};
