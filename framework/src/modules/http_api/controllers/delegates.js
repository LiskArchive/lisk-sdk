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

const _ = require('lodash');
const swaggerHelper = require('../helpers/swagger');
const BlockReward = require('../../logic/block_reward');
const { calculateApproval } = require('../helpers/http_api');

// Private Fields
let modules;
let storage;
let blockReward;
const { EPOCH_TIME } = global.constants;

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
	storage = scope.storage;
	blockReward = new BlockReward();
}

function delegateFormatter(totalSupply, delegate) {
	const result = _.pick(delegate, [
		'username',
		'vote',
		'rewards',
		'producedBlocks',
		'missedBlocks',
		'productivity',
		'rank',
	]);

	result.account = {
		address: delegate.address,
		publicKey: delegate.publicKey,
		secondPublicKey: delegate.secondPublicKey || '',
	};

	result.approval = calculateApproval(result.vote, totalSupply);

	result.rank = parseInt(result.rank);

	return result;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
DelegatesController.getDelegates = async function(context, next) {
	const params = context.request.swagger.params;

	let filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
		secondPublicKey: params.secondPublicKey.value,
		username: params.username.value,
	};

	if (params.search.value) {
		filters.username_like = `%${params.search.value}%`;
	}

	let options = {
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
		extended: true,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));
	options = _.pickBy(options, v => !(v === undefined || v === null));

	try {
		const delegates = await storage.entities.Account.get(
			{ isDelegate: true, ...filters },
			options
		);

		let lastBlock = await storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1 }
		);
		lastBlock = lastBlock[0];

		const data = delegates.map(
			delegateFormatter.bind(
				null,
				lastBlock.height ? blockReward.calcSupply(lastBlock.height) : 0
			)
		);

		return next(null, {
			data,
			meta: {
				offset: options.offset,
				limit: options.limit,
			},
		});
	} catch (error) {
		return next(error);
	}
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
DelegatesController.getForgers = function(context, next) {
	const params = context.request.swagger.params;

	const filters = {
		limit: params.limit.value,
		offset: params.offset.value,
	};

	return modules.delegates.shared.getForgers(_.clone(filters), (err, data) => {
		if (err) {
			return next(err);
		}

		data.meta.limit = filters.limit;
		data.meta.offset = filters.offset;

		data.links = {};

		return next(null, data);
	});
};

DelegatesController.getForgingStatistics = function(context, next) {
	const params = context.request.swagger.params;

	const filters = {
		address: params.address.value,
		start: params.fromTimestamp.value,
		end: params.toTimestamp.value,
	};

	return modules.delegates.shared.getForgingStatistics(
		filters,
		(err, reward) => {
			if (err) {
				if (
					err === 'Account not found' ||
					err === 'Account is not a delegate'
				) {
					return next(
						swaggerHelper.generateParamsErrorObject([params.address], [err])
					);
				}
				return next(err);
			}

			return next(null, {
				data: {
					fees: reward.fees,
					rewards: reward.rewards,
					forged: reward.forged,
					count: reward.count,
				},
				meta: {
					fromTimestamp: filters.start || EPOCH_TIME.getTime(),
					toTimestamp: filters.end || Date.now(),
				},
				links: {},
			});
		}
	);
};

module.exports = DelegatesController;
