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
const transactionTypes = require('../helpers/transaction_types.js');

// Private Fields
let storage;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @param {Object} scope - App instance
 * @todo Add description of DappsController
 */
function DappsController(scope) {
	storage = scope.components.storage;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
DappsController.getDapps = async function(context, next) {
	const params = context.request.swagger.params;

	let options = {
		sort: params.sort.value,
		limit: params.limit.value,
		offset: params.offset.value,
		extended: true,
	};

	// Remove options with null values
	options = _.pickBy(options, v => !(v === undefined || v === null));

	// We don't want to change the API so we fix the sort field name here
	options.sort = options.sort.replace('name', 'dapp_name');

	const filters = [];

	if (params.transactionId.value) {
		filters.push({
			id: params.transactionId.value,
			type: transactionTypes.DAPP,
		});
	}

	if (params.name.value) {
		filters.push({
			dapp_name: params.name.value,
			type: transactionTypes.DAPP,
		});
	}

	if (filters.length === 0) {
		filters.push({ type: transactionTypes.DAPP });
	}

	try {
		let data = await storage.entities.Transaction.get(filters, options);
		data = _.cloneDeep(data);

		const dapps = data.map(aDapp => ({
			name: aDapp.asset.dapp.name,
			description: aDapp.asset.dapp.description,
			tags: aDapp.asset.dapp.tags,
			link: aDapp.asset.dapp.link,
			type: aDapp.asset.dapp.type,
			category: aDapp.asset.dapp.category,
			icon: aDapp.asset.dapp.icon,
			transactionId: aDapp.id,
		}));

		data = dapps.map(dapp => {
			if (_.isNull(dapp.description)) {
				dapp.description = '';
			}
			if (_.isNull(dapp.tags)) {
				dapp.tags = '';
			}
			if (_.isNull(dapp.icon)) {
				dapp.icon = '';
			}
			return dapp;
		});

		return next(null, {
			data,
			meta: {
				offset: options.offset,
				limit: options.limit,
			},
		});
	} catch (error) {
		return next(error);
	}
};

module.exports = DappsController;
