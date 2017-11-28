'use strict';

var _ = require('lodash');

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class DappsController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function DappsController (scope) {
	modules = scope.modules;
}

DappsController.getDapps = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		transactionId: params.transactionId.value,
		name: params.name.value,
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	modules.dapps.shared.getDapps(_.clone(filters), function (err, data) {
		try {
			if (err) { return next(err); }

			next(null, {
				data: data,
				meta: {
					offset: filters.offset,
					limit: filters.limit
				}
			});

		} catch (error) {
			next(error);
		}
	});
};

module.exports = DappsController;
