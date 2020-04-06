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
const swaggerHelper = require('../helpers/swagger');
const { calculateApproval } = require('../helpers/utils');

let storage;
let channel;

function AccountsController(scope) {
	({ storage } = scope.components);
	({ channel } = scope);
}

function accountFormatter(totalSupply, account) {
	const formattedAccount = _.pick(account, [
		'address',
		'publicKey',
		'balance',
		'nonce',
		'asset',
		'keys',
		'votes',
		'delegate',
		'isDelegate',
		'username',
	]);

	if (account.isDelegate) {
		formattedAccount.delegate = _.pick(account, [
			'username',
			'voteWeight',
			'rewards',
			'producedBlocks',
			'missedBlocks',
			'productivity',
		]);

		// Computed fields
		formattedAccount.delegate.approval = calculateApproval(
			formattedAccount.delegate.voteWeight,
			totalSupply,
		);
	}

	// If an account is not multi signature, then do not include keys for response
	if (formattedAccount.keys.numberOfSignatures === 0) {
		delete formattedAccount.keys;
	}

	formattedAccount.publicKey = formattedAccount.publicKey || '';

	return formattedAccount;
}

AccountsController.getAccounts = async (context, next) => {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

	let filters = {
		address_eql: params.address.value,
		publicKey_eql: params.publicKey.value,
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
		const lastBlock = await channel.invoke('app:getLastBlock');
		const accounts = await storage.entities.Account.get(filters, options);

		const data = accounts.map(
			accountFormatter.bind(
				null,
				lastBlock.height
					? await channel.invoke('app:calculateSupply', {
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

module.exports = AccountsController;
