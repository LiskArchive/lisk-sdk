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
const Promise = require('bluebird');
const swaggerHelper = require('../helpers/swagger');
const { calculateApproval } = require('../helpers/utils');

// Private Fields
let storage;
let channel;

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
	({ storage } = scope.components);
	({ channel } = scope);
}

function accountFormatter(totalSupply, account) {
	const formattedAccount = _.pick(account, [
		'address',
		'publicKey',
		'balance',
		'secondPublicKey',
		'asset',
	]);

	if (account.isDelegate) {
		formattedAccount.delegate = _.pick(account, [
			'username',
			'vote',
			'rewards',
			'producedBlocks',
			'missedBlocks',
			'rank',
			'productivity',
		]);

		formattedAccount.delegate.rank = parseInt(
			formattedAccount.delegate.rank,
			10,
		);

		// Computed fields
		formattedAccount.delegate.approval = calculateApproval(
			formattedAccount.delegate.vote,
			totalSupply,
		);
	}

	formattedAccount.publicKey = formattedAccount.publicKey || '';
	formattedAccount.secondPublicKey = formattedAccount.secondPublicKey || '';

	return formattedAccount;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
AccountsController.getAccounts = async function(context, next) {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

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
		extended: false,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	try {
		const lastBlock = await channel.invoke('chain:getLastBlock');
		const data = await storage.entities.Account.get(filters, options).map(
			accountFormatter.bind(
				null,
				lastBlock.height
					? await channel.invoke('chain:calculateSupply', {
							height: lastBlock.height,
					  })
					: 0,
			),
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

async function multiSigAccountFormatter(account) {
	const result = _.pick(account, [
		'address',
		'publicKey',
		'balance',
		'secondPublicKey',
	]);
	result.min = account.multiMin;
	result.lifetime = account.multiLifetime;

	if (result.secondPublicKey === null) {
		result.secondPublicKey = '';
	}

	const members = await storage.entities.Account.get({
		publicKey_in: account.membersPublicKeys,
	});

	result.members = members.map(member => {
		member = _.pick(member, ['address', 'publicKey', 'secondPublicKey']);
		if (member.secondPublicKey === null) {
			member.secondPublicKey = '';
		}
		return member;
	});

	return result;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
AccountsController.getMultisignatureGroups = async function(context, next) {
	const address = context.request.swagger.params.address.value;

	if (!address) {
		return next(
			swaggerHelper.generateParamsErrorObject(
				['address'],
				['Invalid address specified'],
			),
		);
	}

	const filters = {
		address,
		multiMin_gt: 0,
	};

	try {
		let account = await storage.entities.Account.getOne(filters, {
			extended: true,
		});
		account = await multiSigAccountFormatter(account);

		return next(null, {
			data: [account],
			meta: {
				offset: filters.offset,
				limit: filters.limit,
			},
		});
	} catch (error) {
		// TODO: Improve it later by having custom error class from storage
		// https://github.com/vitaly-t/pg-promise/blob/master/lib/errors/queryResult.js#L29
		// code(0) == queryResultErrorCode.noData

		if (error.code === 0) {
			context.statusCode = 404;
			return next(new Error('Multisignature account not found'));
		}

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
AccountsController.getMultisignatureMemberships = async function(
	context,
	next,
) {
	const address = context.request.swagger.params.address.value;

	if (!address) {
		return next(
			swaggerHelper.generateParamsErrorObject(
				['address'],
				['Invalid address specified'],
			),
		);
	}

	let account;

	try {
		account = await storage.entities.Account.getOne(
			{ address },
			{ extended: true },
		);
	} catch (error) {
		if (error.code === 0) {
			context.statusCode = 404;
			return next(new Error('Multisignature membership account not found'));
		}
		return next(error);
	}

	try {
		let groups = await storage.entities.Account.get(
			{ membersPublicKeys_in: [account.publicKey] },
			{ extended: true },
		);

		groups = await Promise.map(groups, multiSigAccountFormatter);

		return next(null, {
			data: groups,
			meta: {},
		});
	} catch (error) {
		return next(error);
	}
};

module.exports = AccountsController;
