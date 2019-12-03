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
const apiCodes = require('../api_codes');
const swaggerHelper = require('../helpers/swagger');

const { MAX_VOTES_PER_ACCOUNT } = global.constants;
const { generateParamsErrorObject } = swaggerHelper;

let storage;

const getFilterAndOptionsFormParams = params => {
	let filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
		secondPublicKey: params.secondPublicKey.value,
		username: params.username.value,
	};

	let options = {
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
		extended: true,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));
	options = _.pickBy(options, v => !(v === undefined || v === null));

	return { filters, options };
};

const validateFilters = (filters, params) => {
	if (
		!(
			filters.username ||
			filters.address ||
			filters.publicKey ||
			filters.secondPublicKey
		)
	) {
		const error = generateParamsErrorObject(
			[
				params.address,
				params.publicKey,
				params.secondPublicKey,
				params.username,
			],
			[
				'address is required if publicKey, secondPublicKey and username not provided.',
				'publicKey is required if address, secondPublicKey and username not provided.',
				'secondPublicKey is required if address, publicKey and username not provided.',
				'username is required if publicKey, secondPublicKey and address not provided.',
			],
		);

		return error;
	}

	return undefined;
};

function VotersController(scope) {
	({ storage } = scope.components);
}

VotersController.getVoters = async (context, next) => {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

	const { filters, options } = getFilterAndOptionsFormParams(params);

	const filterError = validateFilters(filters, params);

	if (filterError) {
		return next(filterError);
	}

	try {
		// TODO: To keep the consistent behavior of functional tests
		// not test the account for being a delegate
		// const delegateFilters = { isDelegate: true, ...filters };
		const delegateFilters = { ...filters };

		const delegate = await storage.entities.Account.getOne(delegateFilters);

		const data = _.pick(delegate, [
			'username',
			'publicKey',
			'votes',
			'address',
			'balance',
		]);

		// TODO: Make sure we return empty string in case of null username
		// This can be avoided when we fix the `isDelegate` inconsistency mentioned above.
		data.username = data.username || '';

		const voters = await storage.entities.Account.get(
			{ votedDelegatesPublicKeys: `"${delegate.publicKey}"` }, // Need to add quotes for PSQL array search
			options,
		);

		data.voters = _.map(voters, voter =>
			_.pick(voter, ['address', 'publicKey', 'balance']),
		);

		const votersCount = await storage.entities.Account.count({
			votedDelegatesPublicKeys: `"${delegate.publicKey}"`, // Need to add quotes for PSQL array search
		});

		data.votes = votersCount;

		return next(null, {
			data,
			meta: {
				offset: options.offset,
				limit: options.limit,
			},
		});
	} catch (error) {
		if (error.code === 0) {
			context.statusCode = apiCodes.NOT_FOUND;
			return next(new Error('Delegate not found'));
		}
		return next(error);
	}
};

VotersController.getVotes = async (context, next) => {
	const { params } = context.request.swagger;

	const { filters, options } = getFilterAndOptionsFormParams(params);

	const filterError = validateFilters(filters, params);

	if (filterError) {
		return next(filterError);
	}

	try {
		// TODO: To keep the consistent behavior of functional tests
		// not test the account for being a delegate
		// const delegateFilters = { isDelegate: true, ...filters };
		const delegateFilters = { ...filters };

		const delegate = await storage.entities.Account.getOne(delegateFilters);

		const data = _.pick(delegate, [
			'address',
			'balance',
			'username',
			'publicKey',
		]);
		const votes = await storage.entities.Account.get(
			{ publicKey_in: delegate.votedDelegatesPublicKeys },
			options,
		);

		data.votesUsed = await storage.entities.Account.count({
			publicKey_in: delegate.votedDelegatesPublicKeys,
		});
		data.votesAvailable = MAX_VOTES_PER_ACCOUNT - data.votesUsed;
		data.votes = votes.map(vote =>
			_.pick(vote, ['address', 'publicKey', 'balance', 'username']),
		);

		data.votes.concat(data).forEach(entity => {
			if (_.isNull(entity.username)) {
				entity.username = '';
			}
		});

		return next(null, {
			data,
			meta: {
				offset: options.offset,
				limit: options.limit,
			},
		});
	} catch (error) {
		if (error.code === 0) {
			context.statusCode = apiCodes.NOT_FOUND;
			return next(new Error('Delegate not found'));
		}
		return next(error);
	}
};

module.exports = VotersController;
