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
const Bignum = require('../../helpers/bignum.js');
const swaggerHelper = require('../../helpers/swagger');
const BlockReward = require('../../logic/block_reward');
const apiCodes = require('../../helpers/api_codes.js');
const ApiError = require('../../helpers/api_error.js');
const { calculateApproval } = require('../../helpers/http_api');
const slots = require('../../helpers/slots.js');
// Private Fields
let modules;
let storage;
let blockReward;
let logger;
const { EPOCH_TIME, ACTIVE_DELEGATES } = global.constants;

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
	storage = scope.components.storage;
	logger = scope.components.logger;
	blockReward = new BlockReward();
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
DelegatesController.getForgers = async function(context, next) {
	const params = context.request.swagger.params;

	const filters = {
		limit: params.limit.value,
		offset: params.offset.value,
	};

	const [lastBlock] = await storage.entities.Block.get(
		{},
		{ sort: 'height:desc', limit: 1 }
	);

	const lastBlockSlot = slots.getSlotNumber(lastBlock.timestamp);
	const currentSlot = slots.getSlotNumber();

	modules.delegates.getForgers(_.clone(filters), (err, forgers) => {
		if (err) {
			return next(new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR));
		}

		return next(null, {
			data: forgers,
			meta: {
				lastBlock: lastBlock.height,
				lastBlockSlot,
				currentSlot,
				limit: filters.limit,
				offset: filters.offset,
			},
			links: {},
		});
	});
};

DelegatesController.getForgingStatistics = async function(context, next) {
	const params = context.request.swagger.params;

	const filters = {
		address: params.address.value,
		start: params.fromTimestamp.value,
		end: params.toTimestamp.value,
	};

	let reward;
	try {
		reward = await _getForgingStatistics(filters);
	} catch (err) {
		if (err === 'Account not found' || err === 'Account is not a delegate') {
			return next(
				swaggerHelper.generateParamsErrorObject([params.address], [err])
			);
		}
		return next(err);
	}

	const data = _.pick(reward, ['fees', 'rewards', 'forged', 'count']);

	return next(null, {
		data,
		meta: {
			fromTimestamp: filters.start || EPOCH_TIME.getTime(),
			toTimestamp: filters.end || Date.now(),
		},
		links: {},
	});
};

/**
 *
 * @param {Object} filters - Filters applied to results
 * @param {string} filters.address - Address of the delegate
 * @param {string} filters.start - Start time to aggregate
 * @param {string} filters.end - End time to aggregate
 * @returns {Promise<*>}
 * @private
 */
async function _getForgingStatistics(filters) {
	// If need to aggregate all data then just fetch from the account
	if (!filters.start && !filters.end) {
		let account;

		try {
			account = await storage.entities.Account.getOne({
				address: filters.address,
			});
		} catch (err) {
			if (err.code === 0) {
				throw 'Account not found';
			}
		}

		if (!account.isDelegate) {
			throw 'Account is not a delegate';
		}

		account = _.pick(account, [
			'rewards',
			'fees',
			'producedBlocks',
			'isDelegate',
		]);

		return {
			rewards: account.rewards,
			fees: account.fees,
			count: new Bignum(account.producedBlocks).toString(),
			forged: new Bignum(account.rewards)
				.plus(new Bignum(account.fees))
				.toString(),
		};
	}
	const reward = await _aggregateBlocksReward(filters);
	reward.forged = new Bignum(reward.fees)
		.plus(new Bignum(reward.rewards))
		.toString();

	return reward;
}

/**
 *
 * @param {string} filter.address - Address of the delegate
 * @param {string} filter.start - Start time to aggregate
 * @param {string} filter.end - End time to aggregate
 * @returns {Promise<{fees: (string), count: (string), rewards: (string)}>}
 * @private
 */
async function _aggregateBlocksReward(filter) {
	const params = {};

	let account;

	try {
		account = await storage.entities.Account.getOne({
			address: filter.address,
		});
	} catch (err) {
		if (err.code === 0) {
			throw 'Account not found';
		}
	}

	params.generatorPublicKey = account.publicKey;
	params.delegates = ACTIVE_DELEGATES;

	if (filter.start !== undefined) {
		params.fromTimestamp = Math.floor(
			(filter.start - EPOCH_TIME.getTime()) / 1000
		);
		params.fromTimestamp = params.fromTimestamp.toFixed();
	}

	if (filter.end !== undefined) {
		params.toTimestamp = Math.floor((filter.end - EPOCH_TIME.getTime()) / 1000);
		params.toTimestamp = params.toTimestamp.toFixed();
	}

	let delegateBlocksRewards;

	try {
		delegateBlocksRewards = await storage.entities.Account.delegateBlocksRewards(
			params
		);
	} catch (err) {
		logger.error(err.stack);
		throw 'Blocks#aggregateBlocksReward error';
	}

	let data = delegateBlocksRewards[0];
	if (data.delegate === null) {
		throw 'Account is not a delegate';
	}
	data = {
		fees: data.fees || '0',
		rewards: data.rewards || '0',
		count: data.count || '0',
	};
	return data;
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

module.exports = DelegatesController;
