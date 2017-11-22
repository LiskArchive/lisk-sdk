'use strict';

var _ = require('lodash');
var checkIpInList = require('../../helpers/checkIpInList.js');

// Private Fields
var modules;
var config;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class DelegatesController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function DelegatesController (scope) {
	modules = scope.modules;
	config = scope.config;
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

			return delegate;
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

DelegatesController.getForgingStatus = function (context, next) {

	if (!checkIpInList(config.forging.access.whiteList, context.request.ip)) {
		context.statusCode = 401;
		return next(new Error('Access Denied'));
	}

	var publicKey = context.request.swagger.params.publicKey.value;

	modules.delegates.internal.forgingStatus(publicKey, function (err, data) {
		if(err) {
			context.statusCode = 404;
			return next(err);
		}
		next(null, data);
	});
};

module.exports = DelegatesController;
