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

const { promisify } = require('util');
const _ = require('lodash');
const checkIpInList = require('../../helpers/check_ip_in_list.js');
const apiCodes = require('../../helpers/api_codes');
const swaggerHelper = require('../../helpers/swagger');
const BlockReward = require('../../logic/block_reward.js');
const slots = require('../../helpers/slots.js');

const { EPOCH_TIME, FEES } = global.constants;

// Private Fields
let library;
let blockReward;

/**
 * Get the forging status of a delegate.
 *
 * @param {string} publicKey - Public key of delegate
 * @returns {Promise<object>}
 * @private
 */
async function _getForgingStatus(publicKey) {
	const keyPairs = library.modules.delegates.getForgersKeyPairs();
	const internalForgers = library.config.forging.delegates;
	const forgersPublicKeys = {};

	Object.keys(keyPairs).forEach(key => {
		forgersPublicKeys[keyPairs[key].publicKey.toString('hex')] = true;
	});

	const fullList = internalForgers.map(forger => ({
		forging: !!forgersPublicKeys[forger.publicKey],
		publicKey: forger.publicKey,
	}));

	if (publicKey && _.find(fullList, { publicKey })) {
		return [
			{
				publicKey,
				forging: !!forgersPublicKeys[publicKey],
			},
		];
	}

	if (publicKey && !_.find(fullList, { publicKey })) {
		return [];
	}

	return fullList;
}

/**
 * Toggle the forging status of a delegate.
 * @param {string} publicKey - Public key of a delegate
 * @param {string} password - Password used to decrypt encrypted passphrase
 * @param {boolean} forging - Forging status of a delegate to update
 * @returns {Promise<object>}
 * @todo Add description for the return value
 * @private
 */
async function _updateForgingStatus(publicKey, password, forging) {
	return promisify(library.modules.delegates.updateForgingStatus)(
		publicKey,
		password,
		forging
	);
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
		modules: scope.modules,
		storage: scope.storage,
		config: scope.config,
		build: scope.build,
		lastCommit: scope.lastCommit,
	};
	blockReward = new BlockReward();
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
NodeController.getConstants = async (context, next) => {
	try {
		const [lastBlock] = await library.storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1 }
		);
		const { height } = lastBlock;

		return next(null, {
			build: library.build,
			commit: library.lastCommit,
			epoch: EPOCH_TIME,
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
			milestone: blockReward.calcMilestone(height).toString(),
			reward: blockReward.calcReward(height).toString(),
			supply: blockReward.calcSupply(height).toString(),
			version: library.config.version,
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
		const networkHeight = await promisify(library.modules.peers.networkHeight)({
			normalized: false,
		});

		const data = {
			broadhash: library.modules.system.getBroadhash(),
			consensus: library.modules.peers.getLastConsensus() || 0,
			currentTime: Date.now(),
			secondsSinceEpoch: slots.getTime(),
			height: library.modules.blocks.lastBlock.get().height,
			loaded: library.modules.loader.loaded(),
			networkHeight: networkHeight || 0,
			syncing: library.modules.loader.syncing(),
		};

		data.transactions = await promisify(library.modules.transactions.shared.getTransactionsCount)();
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
	if (!checkIpInList(library.config.forging.access.whiteList, context.request.ip)) {
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
NodeController.updateForgingStatus = function(context, next) {
	if (!checkIpInList(library.config.forging.access.whiteList, context.request.ip)) {
		context.statusCode = apiCodes.FORBIDDEN;
		return next(new Error('Access Denied'));
	}

	const publicKey = context.request.swagger.params.data.value.publicKey;
	const password = context.request.swagger.params.data.value.password;
	const forging = context.request.swagger.params.data.value.forging;

	try {
		const data = _updateForgingStatus(publicKey, password, forging);
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
NodeController.getPooledTransactions = function(context, next) {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const params = context.request.swagger.params;

	const state = context.request.swagger.params.state.value;

	const stateMap = {
		unprocessed: 'getUnProcessedTransactions',
		unconfirmed: 'getUnconfirmedTransactions',
		unsigned: 'getMultisignatureTransactions',
	};

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

	return library.modules.transactions.shared[stateMap[state]].call(
		this,
		_.clone(filters),
		(err, data) => {
			if (err) {
				return next(err);
			}

			const transactions = _.map(
				_.cloneDeep(data.transactions),
				transaction => {
					transaction.senderId = transaction.senderId || '';
					transaction.recipientId = transaction.recipientId || '';
					transaction.recipientPublicKey = transaction.recipientPublicKey || '';

					transaction.amount = transaction.amount.toString();
					transaction.fee = transaction.fee.toString();

					return transaction;
				}
			);

			return next(null, {
				data: transactions,
				meta: {
					offset: filters.offset,
					limit: filters.limit,
					count: parseInt(data.count),
				},
			});
		}
	);
};

module.exports = NodeController;
