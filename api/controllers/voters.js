'use strict';

var _ = require('lodash');
var apiCodes = require('../../helpers/apiCodes');
var ApiError = require('../../helpers/apiError');
var swaggerHelper = require('../../helpers/swagger');
var generateParamsErrorObject = swaggerHelper.generateParamsErrorObject;

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class VotersController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function VotersController (scope) {
	modules = scope.modules;
}

VotersController.getVoters = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
		secondPublicKey: params.secondPublicKey.value,
		username: params.username.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	if (!(filters.username || filters.address || filters.publicKey || filters.secondPublicKey)) {
		var error = generateParamsErrorObject(
			[params.address, params.publicKey, params.secondPublicKey, params.username],
			['address is required if publicKey, secondPublicKey and username not provided.',
			 'publicKey is required if address, secondPublicKey and username not provided.',
			 'secondPublicKey is required if address, publicKey and username not provided.',
			 'username is required if publicKey, secondPublicKey and address not provided.']
		);

		return next(error);
	}

	modules.voters.shared.getVoters(_.clone(filters), function (err, data) {
		if (err) {
			if (err instanceof ApiError) {
				context.statusCode = apiCodes.NOT_FOUND;
				return next('Delegate not found');
			} else {
				return next(err);
			}
		}

		data = _.cloneDeep(data);

		if (_.isNull(data.username)) {
			data.username = '';
		}

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit
			}
		});
	});
};

VotersController.getVotes = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
		secondPublicKey: params.secondPublicKey.value,
		username: params.username.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	if (!(filters.username || filters.address || filters.publicKey || filters.secondPublicKey)) {
		var error = generateParamsErrorObject(
			[params.address, params.publicKey, params.secondPublicKey, params.username],
			['address is required if publicKey, secondPublicKey and username not provided.',
			 'publicKey is required if address, secondPublicKey and username not provided.',
			 'secondPublicKey is required if address, publicKey and username not provided.',
			 'username is required if publicKey, secondPublicKey and address not provided.']
		);

		return next(error);
	}

	modules.voters.shared.getVotes(_.clone(filters), function (err, data) {
		if (err) {
			if (err instanceof ApiError) {
				context.statusCode = apiCodes.NOT_FOUND;
				return next('Delegate not found');
			} else {
				return next(err);
			}
		}

		data = _.cloneDeep(data);

		if (_.isNull(data.username)) {
			data.username = '';
		}

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit
			}
		});
	});
};

module.exports = VotersController;
