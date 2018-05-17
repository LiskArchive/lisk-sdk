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
var bignum = require('../../helpers/bignum.js');
var swaggerHelper = require('../../helpers/swagger');
var constants = require('../../helpers/constants.js');

// Private Fields
var modules;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @param {Object} scope - App instance
 * @todo Add description of DelegatesController
 */
function DelegatesController(scope) {
	modules = scope.modules;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
DelegatesController.getDelegates = function(context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
		secondPublicKey: params.secondPublicKey.value,
		username: params.username.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
		search: params.search.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	modules.delegates.shared.getDelegates(_.clone(filters), (err, data) => {
		if (err) {
			return next(err);
		}

		data = _.cloneDeep(data);

		data = _.map(data, delegate => {
			delegate.account = {
				address: delegate.address,
				publicKey: delegate.publicKey,
				secondPublicKey: delegate.secondPublicKey || '',
			};

			delete delegate.secondPublicKey;
			delete delegate.publicKey;
			delete delegate.address;

			delegate.missedBlocks = parseInt(delegate.missedBlocks);
			delegate.producedBlocks = parseInt(delegate.producedBlocks);
			delegate.rank = parseInt(delegate.rank);

			return delegate;
		});

		next(null, {
			data,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
			},
		});
	});
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
DelegatesController.getForgers = function(context, next) {
	var params = context.request.swagger.params;

	var filters = {
		limit: params.limit.value,
		offset: params.offset.value,
	};

	modules.delegates.shared.getForgers(_.clone(filters), (err, data) => {
		if (err) {
			return next(err);
		}

		data.meta.limit = filters.limit;
		data.meta.offset = filters.offset;

		data.links = {};

		next(null, data);
	});
};

DelegatesController.getForgingStatistics = function(context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value,
		start: params.fromTimestamp.value || constants.epochTime.getTime(),
		end: params.toTimestamp.value || Date.now(),
	};

	modules.blocks.utils.aggregateBlocksReward(filters, (err, reward) => {
		if (err) {
			if (err === 'Account not found' || err === 'Account is not a delegate') {
				return next(
					swaggerHelper.generateParamsErrorObject([params.address], [err])
				);
			}
			return next(err);
		}

		var forged = new bignum(reward.fees)
			.plus(new bignum(reward.rewards))
			.toString();
		var response = {
			data: {
				fees: reward.fees,
				rewards: reward.rewards,
				forged,
				count: reward.count,
			},
			meta: {
				fromTimestamp: filters.start,
				toTimestamp: filters.end,
			},
			links: {},
		};
		return next(null, response);
	});
};

module.exports = DelegatesController;
