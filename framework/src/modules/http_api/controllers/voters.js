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

// Private Fields
let storage;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @requires helpers/apiCodes.NOT_FOUND
 * @requires helpers/apiError
 * @requires helpers/swagger.generateParamsErrorObject
 * @param {Object} scope - App instance
 * @todo Add description of VotersController
 */
function VotersController(scope) {
	({ storage } = scope.components);
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
VotersController.getVoters = async function(context, next) {
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

	let options = {
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
		extended: true,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));
	options = _.pickBy(options, v => !(v === undefined || v === null));

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

		return next(error);
	}

	try {
		// TODO: To keep the consistent behavior of functional tests
		// not test the account for being a delegate
		// const delegateFilters = { isDelegate: true, ...filters };
		const delegateFilters = { ...filters };

		const delegate = await storage.entities.Account.getOne(delegateFilters, {
			extended: true,
		});

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
			{ votedDelegatesPublicKeys_in: [delegate.publicKey] },
			options,
		);

		data.voters = _.map(voters, voter =>
			_.pick(voter, ['address', 'publicKey', 'balance']),
		);

		const votersCount = await storage.entities.Account.count({
			votedDelegatesPublicKeys_in: [delegate.publicKey],
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

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
VotersController.getVotes = async function(context, next) {
	const { params } = context.request.swagger;

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

		return next(error);
	}

	try {
		// TODO: To keep the consistent behavior of functional tests
		// not test the account for being a delegate
		// const delegateFilters = { isDelegate: true, ...filters };
		const delegateFilters = { ...filters };

		const delegate = await storage.entities.Account.getOne(delegateFilters, {
			extended: true,
		});

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
