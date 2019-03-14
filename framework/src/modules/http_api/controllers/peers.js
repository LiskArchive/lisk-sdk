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

// Private Fields
let channel;

/**
 * Description of the function.
 *
 * @class
 * @memberof api.controllers
 * @requires lodash
 * @param {Object} scope - App instance
 * @todo Add description of PeersController
 */
function PeersController(scope) {
	channel = scope.channel;
}

/**
 * Description of the function.
 *
 * @param {Object} context
 * @param {function} next
 * @todo Add description for the function and the params
 */
PeersController.getPeers = async function(context, next) {
	const params = context.request.swagger.params;

	let filters = {
		ip: params.ip.value,
		wsPort: params.wsPort.value,
		httpPort: params.httpPort.value,
		state: params.state.value,
		os: params.os.value,
		version: params.version.value,
		protocolVersion: params.protocolVersion.value,
		broadhash: params.broadhash.value,
		height: params.height.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	try {
		const data = await channel.invoke('chain:getPeers', {
			parameters: filters,
		});

		const clonedData = _.cloneDeep(data);
		const filteredData = clonedData.map(peer => {
			const { updated, ...filtered } = peer;
			return filtered;
		});

		const peersCount = await channel.invoke('chain:getPeersCountByFilter', {
			parameters: _.cloneDeep(filters),
		});

		return next(null, {
			data: filteredData,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
				count: peersCount,
			},
		});
	} catch (err) {
		return next(err);
	}
};

module.exports = PeersController;
