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
const Bignum = require('bignumber.js');
const ApiError = require('../../helpers/api_error');
const swaggerHelper = require('../../helpers/swagger');
const BlockReward = require('../../logic/block_reward');

// Private Fields
let modules;
let storage;
let blockReward;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @requires helpers/apiError
 * @requires helpers/swagger.generateParamsErrorObject
 * @param {Object} scope - App instance
 * @todo Add description of AccountsController
 */
function AccountsController(scope) {
	modules = scope.modules;
	storage = scope.storage;
	blockReward = new BlockReward();
}

function calculateApproval(votersBalance, totalSupply) {
	// votersBalance and totalSupply are sent as strings,
	// we convert them into bignum and send the response as number as well
	const votersBalanceBignum = new Bignum(votersBalance || 0);
	const totalSupplyBignum = new Bignum(totalSupply);
	const approvalBignum = votersBalanceBignum
		.dividedBy(totalSupplyBignum)
		.multipliedBy(100)
		.decimalPlaces(2);

	return !approvalBignum.isNaN() ? approvalBignum.toNumber() : 0;
}

function accountFormatter(account, totalSupply) {
	const object = _.pick(account, [
		'address',
		'publicKey',
		'balance',
		'u_balance',
		'secondPublicKey',
	]);
	object.unconfirmedBalance = object.u_balance;
	delete object.u_balance;

	if (account.isDelegate) {
		object.delegate = _.pick(account, [
			'username',
			'vote',
			'rewards',
			'producedBlocks',
			'missedBlocks',
			'rank',
			'productivity',
		]);

		object.delegate.rank = parseInt(object.delegate.rank);

		// Computed fields
		object.delegate.approval = calculateApproval(object.vote, totalSupply);
	}

	if (_.isNull(object.publicKey)) {
		object.publicKey = '';
	}
	if (_.isNull(object.secondPublicKey)) {
		object.secondPublicKey = '';
	}
	return object;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
AccountsController.getAccounts = async function(context, next) {
	const params = context.request.swagger.params;

	let filters = {
		address_eql: params.address.value,
		publicKey_eql: params.publicKey.value,
		secondPublicKey_eql: params.secondPublicKey.value,
		username_like: params.username.value,
	};

	const options = {
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
		extended: true,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	try {
		let lastBlock = await storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1 }
		);
		lastBlock = lastBlock[0];

		const data = await storage.entities.Account.get(filters, options).map(
			accountFormatter.bind(
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
AccountsController.getMultisignatureGroups = function(context, next) {
	const params = context.request.swagger.params;

	let filters = {
		address: params.address.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	if (!filters.address) {
		return next(
			swaggerHelper.generateParamsErrorObject(
				['address'],
				['Invalid address specified']
			)
		);
	}

	return modules.multisignatures.shared.getGroups(
		_.clone(filters),
		(err, data) => {
			if (err) {
				if (err instanceof ApiError) {
					context.statusCode = err.code;
					delete err.code;
				}

				return next(err);
			}

			return next(null, {
				data,
				meta: {
					offset: filters.offset,
					limit: filters.limit,
				},
			});
		}
	);
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
AccountsController.getMultisignatureMemberships = function(context, next) {
	const params = context.request.swagger.params;

	let filters = {
		address: params.address.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	if (!filters.address) {
		return next(
			swaggerHelper.generateParamsErrorObject(
				['address'],
				['Invalid address specified']
			)
		);
	}

	return modules.multisignatures.shared.getMemberships(
		_.clone(filters),
		(err, data) => {
			if (err) {
				if (err instanceof ApiError) {
					context.statusCode = err.code;
					delete err.code;
				}

				return next(err);
			}

			return next(null, {
				data,
				meta: {
					offset: filters.offset,
					limit: filters.limit,
				},
			});
		}
	);
};

module.exports = AccountsController;
