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

const { EPOCH_TIME, FEES } = global.constants;

let library;

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

NodeController.getStatus = async (context, next) => {
	try {
		const {
			secondsSinceEpoch,
			syncing,
			lastBlock,
			chainMaxHeightFinalized,
		} = await library.channel.invoke('chain:getNodeStatus');

		const data = {
			currentTime: Date.now(),
			secondsSinceEpoch,
			height: lastBlock.height || 0,
			chainMaxHeightFinalized,
			syncing,
		};

		return next(null, data);
	} catch (err) {
		return next(err);
	}
};

NodeController.getForgingStatus = async (context, next) => {
	if (
		!checkIpInList(library.config.forging.access.whiteList, context.request.ip)
	) {
		context.statusCode = apiCodes.FORBIDDEN;
		return next(new Error('Access Denied'));
	}
	const { publicKey, forging } = context.request.swagger.params;

	try {
		const forgingStatus = await _getForgingStatus(publicKey.value);
		if (forging && typeof forging.value === 'boolean') {
			return next(null, forgingStatus.filter(f => f.forging === forging.value));
		}
		return next(null, forgingStatus);
	} catch (err) {
		return next(err);
	}
};

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

NodeController.getPooledTransactions = async (context, next) => {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

	const state = context.request.swagger.params.state.value;

	let filters = {
		id: params.id.value,
		recipientId: params.recipientId.value,
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

		const transactions = data.transactions.map(tx => tx.toJSON());

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
