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
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
AccountsController.getAccounts = function(context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
		secondPublicKey: params.secondPublicKey.value,
		username: params.username.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	modules.accounts.shared.getAccounts(_.clone(filters), (err, data) => {
		if (err) {
			return next(err);
		}

		data = _.cloneDeep(data);

		data = _.map(data, account => {
			if (_.isEmpty(account.delegate)) {
				delete account.delegate;
			} else {
				account.delegate.rank = parseInt(account.delegate.rank);
			}
			if (_.isNull(account.publicKey)) {
				account.publicKey = '';
			}
			if (_.isNull(account.secondPublicKey)) {
				account.secondPublicKey = '';
			}
			delete account.secondSignature;
			delete account.unconfirmedSignature;
			return account;
		});

		next(null, {
			data,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
			},
		});
	});
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
AccountsController.getMultisignatureGroups = function(context, next) {
	var params = context.request.swagger.params;

	var filters = {
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

	modules.multisignatures.shared.getGroups(_.clone(filters), (err, data) => {
		if (err) {
			if (err instanceof ApiError) {
				context.statusCode = err.code;
				delete err.code;
			}

			return next(err);
		}

		next(null, {
			data,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
			},
		});
	});
};

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
AccountsController.getMultisignatureMemberships = function(context, next) {
	var params = context.request.swagger.params;

	var filters = {
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

	modules.multisignatures.shared.getMemberships(
		_.clone(filters),
		(err, data) => {
			if (err) {
				if (err instanceof ApiError) {
					context.statusCode = err.code;
					delete err.code;
				}

				return next(err);
			}

			next(null, {
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
