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
const checkIpInList = require('../helpers/check_ip_in_list');
const apiCodes = require('../api_codes');
const swaggerHelper = require('../helpers/swagger');

const { EPOCH_TIME, FEES } = global.constants;

// Private Fields
let library;

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
			system: scope.components.system,
			storage: scope.components.storage,
		},
		config: scope.config,
		channel: scope.channel,
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
		const [lastBlock] = await library.components.storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1 }
		);
		const { height } = lastBlock;

		const milestone = await library.channel.invoke('chain:calculateMilestone', {
			height,
		});
		const reward = await library.channel.invoke('chain:calculateReward', {
			height,
		});
		const supply = await library.channel.invoke('chain:calculateSupply', {
			height,
		});

		const build = await library.channel.invoke('chain:getBuild');
		const commit = await library.channel.invoke('chain:getLastCommit');

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
		const networkHeight = await library.channel.invoke(
			'chain:getNetworkHeight',
			{
				options: {
					normalized: false,
				},
			}
		);

		const [lastBlock] = await library.components.storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1 }
		);

		const { height } = lastBlock;
		const consensus =
			(await library.channel.invoke('chain:getLastConsensus')) || 0;
		const loaded = await library.channel.invoke('chain:loaderLoaded');
		const syncing = await library.channel.invoke('chain:loaderSyncing');
		const transactions = await library.channel.invoke(
			'chain:getAllTransactionsCount'
		);
		const slotTime = await library.channel.invoke('chain:getSlotTime');

		const data = {
			broadhash: library.components.system.headers.broadhash,
			consensus: consensus || 0,
			currentTime: Date.now(),
			secondsSinceEpoch: slotTime,
			height,
			loaded,
			networkHeight: networkHeight || 0,
			syncing,
			transactions,
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

	const publicKey = context.request.swagger.params.data.value.publicKey;
	const password = context.request.swagger.params.data.value.password;
	const forging = context.request.swagger.params.data.value.forging;

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

	const params = context.request.swagger.params;

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

		const transactions = _.map(_.cloneDeep(data.transactions), transaction => {
			transaction.senderId = transaction.senderId || '';
			transaction.recipientId = transaction.recipientId || '';
			transaction.recipientPublicKey = transaction.recipientPublicKey || '';

			transaction.amount = transaction.amount.toString();
			transaction.fee = transaction.fee.toString();

			return transaction;
		});

		return next(null, {
			data: transactions,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
				count: parseInt(data.count),
			},
		});
	} catch (err) {
		return next(err);
	}
};

/**
 * Get the forging status of a delegate.
 *
 * @param {string} publicKey - Public key of delegate
 * @returns {Promise<object>}
 * @private
 */
async function _getForgingStatus(publicKey) {
	const keyPairs = await library.channel.invoke('chain:getForgersPublicKeys');
	const forgingDelegates = library.config.forging.delegates;
	const forgersPublicKeys = {};

	Object.keys(keyPairs).forEach(key => {
		forgersPublicKeys[keyPairs[key].publicKey.toString('hex')] = true;
	});

	const fullList = forgingDelegates.map(forger => ({
		forging: !!forgersPublicKeys[forger.publicKey],
		publicKey: forger.publicKey,
	}));

	if (publicKey && !_.find(fullList, { publicKey })) {
		return [];
	}

	if (_.find(fullList, { publicKey })) {
		return [
			{
				publicKey,
				forging: !!forgersPublicKeys[publicKey],
			},
		];
	}

	return fullList;
}

module.exports = NodeController;
