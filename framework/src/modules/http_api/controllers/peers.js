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

	await channel.invoke('chain:getPeers', [
		filters,
		async (err, data) => {
			if (err) {
				return next(err);
			}

			data = _.cloneDeep(data);

			data = _.map(data, peer => {
				delete peer.updated;
				return peer;
			});

			const peersCount = await channel.invoke('chain:getPeersCountByFilter', [
				filters,
			]);

			return next(null, {
				data,
				meta: {
					offset: filters.offset,
					limit: filters.limit,
					count: peersCount,
				},
			});
		},
	]);
};

module.exports = PeersController;
