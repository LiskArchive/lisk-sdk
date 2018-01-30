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

var _ = require('lodash');
var ApiError = require('../../helpers/api_error');
var swaggerHelper = require('../../helpers/swagger');

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class AccountsController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function AccountsController (scope) {
	modules = scope.modules;
}

AccountsController.getAccounts = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
		secondPublicKey: params.secondPublicKey.value,
		username: params.username.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	modules.accounts.shared.getAccounts(_.clone(filters), function (err, data) {
		if (err) { return next(err); }

		data = _.cloneDeep(data);

		data = _.map(data, function (account) {
			if (_.isEmpty(account.delegate)) {
				delete account.delegate;
			} else {
				account.delegate.rank = parseInt(account.delegate.rank);
				account.delegate.missedBlocks = parseInt(account.delegate.missedBlocks);
				account.delegate.producedBlocks = parseInt(account.delegate.producedBlocks);
			}
			if (_.isNull(account.secondPublicKey)) {
				account.secondPublicKey = '';
			}
			delete account.secondSignature;
			delete account.unconfirmedSignature;
			return account;
		});

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit
			}
		});
	});
};

AccountsController.getMultisignatureGroups = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	if (!filters.address) {
		return next(swaggerHelper.generateParamsErrorObject(['address'], ['Invalid address specified']));
	}

	modules.multisignatures.shared.getGroups(_.clone(filters), function (err, data) {
		if (err) {
			if (err instanceof ApiError) {
				context.statusCode = err.code;
				delete err.code;
			}

			return next(err);
		}

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit
			}
		});
	});
};

AccountsController.getMultisignatureMemberships = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	if (!filters.address) {
		return next(swaggerHelper.generateParamsErrorObject(['address'], ['Invalid address specified']));
	}

	modules.multisignatures.shared.getMemberships(_.clone(filters), function (err, data) {
		if (err) {
			if (err instanceof ApiError) {
				context.statusCode = err.code;
				delete err.code;
			}

			return next(err);
		}

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit
			}
		});
	});
};

module.exports = AccountsController;
