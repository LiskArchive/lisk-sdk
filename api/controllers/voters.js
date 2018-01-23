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
var apiCodes = require('../../helpers/api_codes');
var ApiError = require('../../helpers/api_error');
var swaggerHelper = require('../../helpers/swagger');
var generateParamsErrorObject = swaggerHelper.generateParamsErrorObject;

// Private Fields
var modules;

/**
 * @module controllers/voters
 * @requires lodash
 * @requires module:helpers/apiError
 * @requires module:helpers/apiCodes.NOT_FOUND
 * @requires module:helpers/swagger.generateParamsErrorObject
 * @param {Object} scope - App instance.
 * @todo: add description of VotersController
 */
function VotersController(scope) {
	modules = scope.modules;
}

/**
 * @public
 * @param {Object} context
 * @param {function} next
 * @todo: add description of the function and its parameters
 */
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
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	if (!(filters.username || filters.address || filters.publicKey || filters.secondPublicKey)) {
		var error = generateParamsErrorObject(
			[params.address, params.publicKey, params.secondPublicKey, params.username],
			[
				'address is required if publicKey, secondPublicKey and username not provided.',
				'publicKey is required if address, secondPublicKey and username not provided.',
				'secondPublicKey is required if address, publicKey and username not provided.',
				'username is required if publicKey, secondPublicKey and address not provided.'
			]
		);

		return next(error);
	}

	modules.voters.shared.getVoters(_.clone(filters), (err, data) => {
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

/**
 * @public
 * @param {Object} context
 * @param {function} next
 * @todo: add description of the function and its parameters
 */
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
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	if (!(filters.username || filters.address || filters.publicKey || filters.secondPublicKey)) {
		var error = generateParamsErrorObject(
			[params.address, params.publicKey, params.secondPublicKey, params.username],
			[
				'address is required if publicKey, secondPublicKey and username not provided.',
				'publicKey is required if address, secondPublicKey and username not provided.',
				'secondPublicKey is required if address, publicKey and username not provided.',
				'username is required if publicKey, secondPublicKey and address not provided.'
			]
		);

		return next(error);
	}

	modules.voters.shared.getVotes(_.clone(filters), (err, data) => {
		if (err) {
			if (err instanceof ApiError) {
				context.statusCode = apiCodes.NOT_FOUND;
				return next('Delegate not found');
			} else {
				return next(err);
			}
		}

		data = _.cloneDeep(data);

		data.votes.concat(data).forEach(entity => {
			if (_.isNull(entity.username)) {
				entity.username = '';
			}
		});

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
