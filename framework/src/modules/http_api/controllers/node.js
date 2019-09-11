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
const checkIpInList = require('../helpers/check_ip_in_list');
const apiCodes = require('../api_codes');
const swaggerHelper = require('../helpers/swagger');
const { CACHE_KEYS_TRANSACTION_COUNT } = require('../../../components/cache');

const { EPOCH_TIME, FEES } = global.constants;

// Private Fields
let library;

/**
 * Get the forging status of a delegate.
 *
 * @param {string} publicKey - Public key of delegate
 * @returns {Promise<object>}
 * @private
 */
async function _getForgingStatus(publicKey) {
	const fullList = await library.channel.invoke(
		'chain:getForgingStatusForAllDelegates',
	);

	if (publicKey && !_.find(fullList, { publicKey })) {
		return [];
	}

	const result = _.find(fullList, { publicKey });
	if (result) {
		return [result];
	}

	return fullList;
}

/**
 * Get the network height
 *
 * @returns Number
 * @private
 */
async function _getNetworkHeight() {
	const peers = await library.channel.invoke('network:getPeers', {
		limit: 100,
		state: 2,
	});
	if (!peers || !peers.length) {
		return 0;
	}
	const networkHeightCount = peers.reduce((previous, { height }) => {
		const heightCount = previous[height] || 0;
		previous[height] = heightCount + 1;
		return previous;
	}, {});
	const heightCountPairs = Object.entries(networkHeightCount);
	const [defaultHeight, defaultCount] = heightCountPairs[0];
	const { height: networkHeight } = heightCountPairs.reduce(
		(prev, [height, count]) => {
			if (count > prev.count) {
				return {
					height,
					count,
				};
			}
			return prev;
		},
		{
			height: defaultHeight,
			count: defaultCount,
		},
	);

	return parseInt(networkHeight, 10);
}

/**
 * Get count of confirmedTransaction from cache
 *
 * @returns Number
 * @private
 */
async function _getConfirmedTransactionCount() {
	// if cache is ready, then get cache and return
	if (library.components.cache.ready) {
		try {
			const data = await library.components.cache.getJsonForKey(
				CACHE_KEYS_TRANSACTION_COUNT,
			);
			if (data && data.confirmed !== null && data.confirmed !== undefined) {
				return data.confirmed;
			}
		} catch (error) {
			library.components.logger.debug("Transaction count wasn't cached");
		}
	}
	const confirmed = await library.components.storage.entities.Transaction.count();
	// only update cache if ready
	if (library.components.cache.ready) {
		try {
			await library.components.cache.setJsonForKey(
				CACHE_KEYS_TRANSACTION_COUNT,
				{
					confirmed,
				},
			);
		} catch (error) {
			// Ignore error and just put warn
			library.components.logger.debug(
				error,
				'Failed to cache Transaction count',
			);
		}
	}
	return confirmed;
}

/**
 * Parse transaction instance to raw data
 *
 * @returns Object
 * @private
 */
function _normalizeTransactionOutput(transaction) {
	return {
		id: transaction.id,
		type: transaction.type,
		amount: transaction.amount.toString(),
		fee: transaction.fee.toString(),
		timestamp: transaction.timestamp,
		senderPublicKey: transaction.senderPublicKey,
		senderId: transaction.senderId || '',
		signature: transaction.signature,
		signatures: transaction.signatures,
		recipientPublicKey: transaction.recipientPublicKey || '',
		recipientId: transaction.recipientId || '',
		asset: transaction.asset,
	};
}

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @requires helpers/apiCodes.FORBIDDEN
 * @requires helpers/apiCodes.NOT_FOUND
 * @requires helpers/checkIpInList
 * @requires helpers/swagger.generateParamsErrorObject
 * @requires helpers/swagger.invalidParams
 * @param {Object} scope - App instance
 * @todo Add description of NodeController
 */
function NodeController(scope) {
	library = {
		components: {
			storage: scope.components.storage,
			cache: scope.components.cache,
			logger: scope.components.logger,
		},
		config: scope.config,
		channel: scope.channel,
		applicationState: scope.applicationState,
		lastCommitId: scope.lastCommitId,
		buildVersion: scope.buildVersion,
	};
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
NodeController.getConstants = async (context, next) => {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	try {
		const lastBlock = await library.channel.invoke('chain:getLastBlock');
		const milestone = await library.channel.invoke('chain:calculateMilestone', {
			height: lastBlock.height,
		});
		const reward = await library.channel.invoke('chain:calculateReward', {
			height: lastBlock.height,
		});
		const supply = await library.channel.invoke('chain:calculateSupply', {
			height: lastBlock.height,
		});

		const { buildVersion: build, lastCommitId: commit } = library;

		return next(null, {
			build,
			commit,
			epoch: new Date(EPOCH_TIME),
			fees: {
				send: FEES.SEND.toString(),
				vote: FEES.VOTE.toString(),
				secondSignature: FEES.SECOND_SIGNATURE.toString(),
				delegate: FEES.DELEGATE.toString(),
				multisignature: FEES.MULTISIGNATURE.toString(),
				dappRegistration: FEES.DAPP_REGISTRATION.toString(),
				dappWithdrawal: FEES.DAPP_WITHDRAWAL.toString(),
				dappDeposit: FEES.DAPP_DEPOSIT.toString(),
			},
			nethash: library.config.nethash,
			nonce: library.config.nonce,
			milestone: milestone.toString(),
			reward: reward.toString(),
			supply: supply.toString(),
			version: library.config.version,
			protocolVersion: library.config.protocolVersion,
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
NodeController.getStatus = async (context, next) => {
	try {
		const {
			consensus,
			secondsSinceEpoch,
			loaded,
			syncing,
			unconfirmedTransactions,
			lastBlock,
		} = await library.channel.invoke('chain:getNodeStatus');

		// get confirmed count from cache or chain

		const [confirmed, networkHeight] = await Promise.all([
			_getConfirmedTransactionCount(),
			_getNetworkHeight(),
		]);
		const total =
			confirmed +
			Object.values(unconfirmedTransactions).reduce(
				(prev, current) => prev + current,
				0,
			);

		const data = {
			broadhash: library.applicationState.broadhash,
			consensus: consensus || 0,
			currentTime: Date.now(),
			secondsSinceEpoch,
			height: lastBlock.height || 0,
			loaded,
			networkHeight,
			syncing,
			transactions: {
				confirmed,
				...unconfirmedTransactions,
				total,
			},
		};

		return next(null, data);
	} catch (err) {
		return next(err);
	}
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
NodeController.getForgingStatus = async (context, next) => {
	if (
		!checkIpInList(library.config.forging.access.whiteList, context.request.ip)
	) {
		context.statusCode = apiCodes.FORBIDDEN;
		return next(new Error('Access Denied'));
	}
	const publicKey = context.request.swagger.params.publicKey.value;

	try {
		const forgingStatus = await _getForgingStatus(publicKey);
		return next(null, forgingStatus);
	} catch (err) {
		return next(err);
	}
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
NodeController.updateForgingStatus = async (context, next) => {
	if (
		!checkIpInList(library.config.forging.access.whiteList, context.request.ip)
	) {
		context.statusCode = apiCodes.FORBIDDEN;
		return next(new Error('Access Denied'));
	}

	const { publicKey } = context.request.swagger.params.data.value;
	const { password } = context.request.swagger.params.data.value;
	const { forging } = context.request.swagger.params.data.value;

	try {
		const data = await library.channel.invoke('chain:updateForgingStatus', {
			publicKey,
			password,
			forging,
		});
		return next(null, [data]);
	} catch (err) {
		context.statusCode = apiCodes.NOT_FOUND;
		return next(err);
	}
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
NodeController.getPooledTransactions = async function(context, next) {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

	const state = context.request.swagger.params.state.value;

	let filters = {
		id: params.id.value,
		recipientId: params.recipientId.value,
		recipientPublicKey: params.recipientPublicKey.value,
		senderId: params.senderId.value,
		senderPublicKey: params.senderPublicKey.value,
		type: params.type.value,
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	try {
		const data = await library.channel.invoke('chain:getTransactionsFromPool', {
			type: state,
			filters: _.clone(filters),
		});

		const transactions = data.transactions.map(_normalizeTransactionOutput);

		return next(null, {
			data: transactions,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
				count: parseInt(data.count, 10),
			},
		});
	} catch (err) {
		return next(err);
	}
};

module.exports = NodeController;
