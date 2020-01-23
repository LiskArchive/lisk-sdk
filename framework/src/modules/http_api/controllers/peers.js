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
const swaggerHelper = require('../helpers/swagger');
const { consolidatePeers, filterByParams } = require('../helpers/utils');
// Private Fields
let channel;

function PeersController(scope) {
	({ channel } = scope);
}

PeersController.getPeers = async (context, next) => {
	const invalidParams = swaggerHelper.invalidParams(context.request);

	if (invalidParams.length) {
		return next(swaggerHelper.generateParamsErrorObject(invalidParams));
	}

	const { params } = context.request.swagger;

	let filters = {
		ip: params.ip.value,
		wsPort: params.wsPort.value,
		httpPort: params.httpPort.value,
		state: params.state.value,
		os: params.os.value,
		version: params.version.value,
		protocolVersion: params.protocolVersion.value,
		height: params.height.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value,
	};

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));

	try {
		const connectedPeers = await channel.invoke('app:getConnectedPeers');
		const disconnectedPeers = await channel.invoke('app:getDisconnectedPeers');

		const peersByFilters = filterByParams(
			consolidatePeers(connectedPeers, disconnectedPeers),
			filters,
		);

		const { limit, offset, ...filterWithoutLimitOffset } = filters;

		const peersCount = filterByParams(
			consolidatePeers(connectedPeers, disconnectedPeers),
			filterWithoutLimitOffset,
		).length;

		const peersWithoutPeerId = peersByFilters.map(peer => {
			const { peerId, ...restOfPeer } = peer;
			return restOfPeer;
		});
		return next(null, {
			data: peersWithoutPeerId,
			meta: {
				offset: params.offset.value,
				limit: params.limit.value,
				count: peersCount,
			},
		});
	} catch (err) {
		return next(err);
	}
};

module.exports = PeersController;
