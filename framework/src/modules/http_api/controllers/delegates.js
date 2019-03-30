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
const Bignumber = require('bignumber.js');
const swaggerHelper = require('../helpers/swagger');
const apiCodes = require('../api_codes');
const ApiError = require('../api_error');
const { calculateApproval } = require('../helpers/utils');
// Private Fields
let storage;
let logger;
let channel;
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
	storage = scope.components.storage;
	logger = scope.components.logger;
	channel = scope.channel;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
DelegatesController.getDelegates = async function(context, next) {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

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
		const data = await _getDelegates(filters, options);
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

	try {
		const forgers = await _getForgers(filters);
		return next(null, forgers);
	} catch (error) {
		return next(new ApiError(error, apiCodes.INTERNAL_SERVER_ERROR));
	}
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
			fromTimestamp: filters.start || new Date(EPOCH_TIME).getTime(),
			toTimestamp: filters.end || Date.now(),
		},
		links: {},
	});
};

/**
 * Gets a list of delegates based on query parameters
 * @param {Object} filters - Query object
 * @param {int} filters.limit - Limit applied to results
 * @param {int} filters.offset - Offset value for results
 * @param {object} options - Filter options
 * @returns {Promise<*>}
 * @private
 */
async function _getDelegates(filters, options) {
	const delegates = await storage.entities.Account.get(
		{ isDelegate: true, ...filters },
		options
	);

	const [lastBlock] = await storage.entities.Block.get(
		{},
		{ sort: 'height:desc', limit: 1 }
	);

	const supply = lastBlock.height
		? await channel.invoke('chain:calculateSupply', {
				height: lastBlock.height,
			})
		: 0;

	return delegates.map(delegate => delegateFormatter(supply, delegate));
}

/**
 * Gets a list forgers based on query parameters.
 *
 * @param {Object} filters - Query object
 * @param {int} filters.limit - Limit applied to results
 * @param {int} filters.offset - Offset value for results
 * @returns {Promise<Array<object>>}
 * @private
 */
async function _getForgers(filters) {
	const [lastBlock] = await storage.entities.Block.get(
		{},
		{ sort: 'height:desc', limit: 1 }
	);
	const lastBlockSlot = await channel.invoke('chain:getSlotNumber', {
		epochTime: lastBlock.timestamp,
	});
	const currentSlot = await channel.invoke('chain:getSlotNumber');
	const forgerKeys = [];

	const round = await channel.invoke('chain:calcSlotRound', {
		height: lastBlock.height + 1,
	});

	const activeDelegates = await channel.invoke('chain:generateDelegateList', {
		round,
	});

	for (
		let i = filters.offset + 1;
		i <= ACTIVE_DELEGATES && i <= filters.limit + filters.offset;
		i++
	) {
		if (activeDelegates[(currentSlot + i) % ACTIVE_DELEGATES]) {
			forgerKeys.push(activeDelegates[(currentSlot + i) % ACTIVE_DELEGATES]);
		}
	}

	const forgers = (await storage.entities.Account.get(
		{ isDelegate: true, publicKey_in: forgerKeys },
		{ limit: null }
	))
		.map(({ username, address, publicKey }) => ({
			username,
			address,
			publicKey,
			nextSlot: forgerKeys.indexOf(publicKey) + currentSlot + 1,
		}))
		.sort((prev, next) => prev.nextSlot > next.nextSlot);

	return {
		data: forgers,
		meta: {
			lastBlock: lastBlock.height,
			lastBlockSlot,
			currentSlot,
			limit: filters.limit,
			offset: filters.offset,
		},
		links: {},
	};
}

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
			count: new Bignumber(account.producedBlocks).toFixed(),
			forged: new Bignumber(account.rewards)
				.plus(new Bignumber(account.fees))
				.toFixed(),
		};
	}
	const reward = await _aggregateBlocksReward(filters);
	reward.forged = new Bignumber(reward.fees)
		.plus(new Bignumber(reward.rewards))
		.toFixed();

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
			(filter.start - new Date(EPOCH_TIME).getTime()) / 1000
		);
		params.fromTimestamp = params.fromTimestamp.toFixed();
	}

	if (filter.end !== undefined) {
		params.toTimestamp = Math.floor(
			(filter.end - new Date(EPOCH_TIME).getTime()) / 1000
		);
		params.toTimestamp = params.toTimestamp.toFixed();
	}

	let delegateBlocksRewards;

	try {
		delegateBlocksRewards = await channel.invoke(
			'chain:getDelegateBlocksRewards',
			{ filters: params }
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
