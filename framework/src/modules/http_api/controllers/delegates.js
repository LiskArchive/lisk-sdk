/*
 * Copyright © 2019 Lisk Foundation
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
const BigNum = require('@liskhq/bignum');
const swaggerHelper = require('../helpers/swagger');
const apiCodes = require('../api_codes');
const ApiError = require('../api_error');
const { calculateApproval } = require('../helpers/utils');
// Private Fields
let storage;
let logger;
let channel;
const { EPOCH_TIME, ACTIVE_DELEGATES } = global.constants;

function delegateFormatter(totalSupply, delegate) {
	const result = _.pick(delegate, [
		'username',
		'voteWeight',
		'rewards',
		'producedBlocks',
		'missedBlocks',
		'productivity',
	]);

	result.account = {
		address: delegate.address,
		publicKey: delegate.publicKey,
		secondPublicKey: delegate.secondPublicKey || '',
	};

	result.approval = calculateApproval(result.voteWeight, totalSupply);

	return result;
}

async function _getDelegates(filters, options) {
	const delegates = await storage.entities.Account.get(
		{ isDelegate: true, ...filters },
		options,
	);

	const lastBlock = await channel.invoke('chain:getLastBlock');

	const supply = lastBlock.height
		? await channel.invoke('chain:calculateSupply', {
				height: lastBlock.height,
		  })
		: 0;

	return delegates.map(delegate => delegateFormatter(supply, delegate));
}

async function _getForgers(filters) {
	const lastBlock = await channel.invoke('chain:getLastBlock');

	const lastBlockSlot = await channel.invoke('chain:getSlotNumber', {
		epochTime: lastBlock.timestamp,
	});
	const currentSlot = await channel.invoke('chain:getSlotNumber');
	const forgerKeys = [];

	const currentRound = await channel.invoke('chain:calcSlotRound', {
		height: lastBlock.height + 1,
	});

	const activeDelegates = await channel.invoke(
		'chain:getForgerPublicKeysForRound',
		{
			round: currentRound,
		},
	);

	for (
		let i = filters.offset + 1;
		i <= ACTIVE_DELEGATES && i <= filters.limit + filters.offset;
		// eslint-disable-next-line no-plusplus
		i++
	) {
		if (activeDelegates[(currentSlot + i) % ACTIVE_DELEGATES]) {
			forgerKeys.push(activeDelegates[(currentSlot + i) % ACTIVE_DELEGATES]);
		}
	}

	const forgers = (await storage.entities.Account.get(
		{ isDelegate: true, publicKey_in: forgerKeys },
		{ limit: null },
	))
		.map(({ username, address, publicKey }) => ({
			username,
			address,
			publicKey,
			nextSlot: forgerKeys.indexOf(publicKey) + currentSlot + 1,
		}))
		.sort((prev, next) => (prev.nextSlot > next.nextSlot ? 1 : -1));

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

async function _aggregateBlocksReward(filter) {
	const params = {};

	let account;

	try {
		account = await storage.entities.Account.getOne({
			address: filter.address,
		});
	} catch (err) {
		if (err.code === 0) {
			throw new Error('Account not found');
		}
	}

	params.generatorPublicKey = account.publicKey;

	if (filter.start !== undefined) {
		params.fromTimestamp = Math.floor(
			(filter.start - new Date(EPOCH_TIME).getTime()) / 1000,
		);
		params.fromTimestamp = params.fromTimestamp.toFixed();
	}

	if (filter.end !== undefined) {
		params.toTimestamp = Math.floor(
			(filter.end - new Date(EPOCH_TIME).getTime()) / 1000,
		);
		params.toTimestamp = params.toTimestamp.toFixed();
	}

	let delegateBlocksRewards;

	try {
		delegateBlocksRewards = await storage.entities.Block.delegateBlocksRewards(
			params,
		);
	} catch (err) {
		logger.error(err.stack);
		throw new Error('Blocks#aggregateBlocksReward error');
	}

	let data = delegateBlocksRewards[0];
	if (data.delegate === null) {
		throw new Error('Account is not a delegate');
	}
	data = {
		fees: data.fees || '0',
		rewards: data.rewards || '0',
		count: data.count || '0',
	};
	return data;
}

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
				throw new Error('Account not found');
			}
		}

		if (!account.isDelegate) {
			throw new Error('Account is not a delegate');
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
			count: new BigNum(account.producedBlocks).toFixed(),
			forged: new BigNum(account.rewards)
				.plus(new BigNum(account.fees))
				.toFixed(),
		};
	}
	const reward = await _aggregateBlocksReward(filters);
	reward.forged = new BigNum(reward.fees)
		.plus(new BigNum(reward.rewards))
		.toFixed();

	return reward;
}

function DelegatesController(scope) {
	({
		components: { storage, logger },
		channel,
	} = scope);
}

DelegatesController.getDelegates = async (context, next) => {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

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

DelegatesController.getForgers = async (context, next) => {
	const { params } = context.request.swagger;

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

DelegatesController.getForgingStatistics = async (context, next) => {
	const { params } = context.request.swagger;

	const filters = {
		address: params.address.value,
		start: params.fromTimestamp.value,
		end: params.toTimestamp.value,
	};

	let reward;
	try {
		reward = await _getForgingStatistics(filters);
	} catch (err) {
		if (
			err.message === 'Account not found' ||
			err.message === 'Account is not a delegate'
		) {
			return next(
				swaggerHelper.generateParamsErrorObject(
					[params.address],
					[err.message],
				),
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

module.exports = DelegatesController;
