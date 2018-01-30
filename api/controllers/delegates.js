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

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class DelegatesController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function DelegatesController (scope) {
	modules = scope.modules;
}

DelegatesController.getDelegates = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		address: params.address.value,
		publicKey: params.publicKey.value,
		secondPublicKey: params.secondPublicKey.value,
		username: params.username.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
		search: params.search.value,
		rank: params.rank.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	modules.delegates.shared.getDelegates(_.clone(filters), function (err, data) {
		if (err) { return next(err); }

		data = _.cloneDeep(data);

		data = _.map(data, function (delegate) {
			delegate.account = {
				address: delegate.address,
				publicKey: delegate.publicKey,
				secondPublicKey: delegate.secondPublicKey || ''
			};

			delete delegate.secondPublicKey;
			delete delegate.publicKey;
			delete delegate.address;

			delegate.missedBlocks = parseInt(delegate.missedBlocks);
			delegate.producedBlocks = parseInt(delegate.producedBlocks);
			delegate.rank = parseInt(delegate.rank);

			return delegate;
		});

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
				count: data.length
			}
		});
	});
};

DelegatesController.getForgers = function (context, next) {
	var params = context.request.swagger.params;

	var filters = {
		limit: params.limit.value,
		offset: params.offset.value
	};

	modules.delegates.shared.getForgers(_.clone(filters), function (err, data) {
		if (err) { return next(err); }

		data.meta.limit = filters.limit;
		data.meta.offset = filters.offset;

		data.links = {};

		next(null, data);
	});
};

module.exports = DelegatesController;
