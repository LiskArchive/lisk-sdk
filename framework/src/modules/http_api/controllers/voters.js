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

const { generateParamsErrorObject } = swaggerHelper;

let storage;
const maxVotesPerAccount = 101;

const getFilterAndOptionsFormParams = params => {
	let filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
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
	if (!(filters.username || filters.address || filters.publicKey)) {
		const error = generateParamsErrorObject(
			[params.address, params.publicKey, params.username],
			[
				'address is required if publicKey and username not provided.',
				'publicKey is required if address and username not provided.',
				'username is required if publicKey and address not provided.',
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
		const delegateFilters = { ...filters, isDelegate: 1 };

		const delegate = await storage.entities.Account.getOne(delegateFilters);

		const data = _.pick(delegate, [
			'username',
			'publicKey',
			'votes',
			'address',
			'balance',
		]);

		const delegateVoters = await storage.entities.Account.get(
			{ votes_for_delegate: delegate.address },
			options,
		);

		data.voters = _.map(delegateVoters, voter =>
			_.pick(voter, ['address', 'publicKey', 'totalVotesReceived', 'votes']),
		);

		data.voteCount = delegateVoters.length;

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

		const account = await storage.entities.Account.getOne(delegateFilters);

		const data = _.pick(account, [
			'address',
			'balance',
			'username',
			'publicKey',
			'votes',
		]);

		// Get voted delegate details
		const votedDelegatesAddresses = data.votes.map(
			aVote => aVote.delegateAddress,
		);

		const votedDelegates = await storage.entities.Account.get(
			{ address_in: votedDelegatesAddresses },
			options,
		);

		data.votes.forEach(aVote => {
			const { username, totalVotesReceived, delegate } = votedDelegates.find(
				aDelegate => aDelegate.address === aVote.delegateAddress,
			);
			// eslint-disable-next-line no-param-reassign
			aVote.delegate = {
				username,
				totalVotesReceived,
				delegate,
			};
		});

		data.votesAvailable = maxVotesPerAccount - votedDelegatesAddresses.length;

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
