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

const BigNum = require('@liskhq/bignum');

const { shuffle } = require('lodash');

const PEER_STATE_CONNECTED = 'connected';
const PEER_STATE_DISCONNECTED = 'disconnected';

const sortPeers = (field, asc) => (a, b) => {
	// Match the default JavaScript sort order.
	if (a[field] === b[field]) {
		return 0;
	}
	// Ascending
	if (asc) {
		// Undefined last
		if (a[field] === undefined) {
			return 1;
		}
		if (b[field] === undefined) {
			return -1;
		}
		// Null second last
		if (a[field] === null) {
			return 1;
		}
		if (b[field] === null) {
			return -1;
		}
		if (a[field] < b[field]) {
			return -1;
		}

		return 1;
	}
	// Descending
	// Undefined first
	if (a[field] === undefined) {
		return -1;
	}
	if (b[field] === undefined) {
		return 1;
	}
	// Null second
	if (a[field] === null) {
		return -1;
	}
	if (b[field] === null) {
		return 1;
	}
	if (a[field] < b[field]) {
		return 1;
	}

	return -1;
};

const filterByParams = (peers, filters) => {
	const allowedFields = [
		'ip',
		'wsPort',
		'httpPort',
		'state',
		'os',
		'version',
		'protocolVersion',
		'height',
	];
	const {
		limit: filterLimit,
		offset: filterOffset,
		sort,
		...otherFilters
	} = filters;
	const limit = filterLimit ? Math.abs(filterLimit) : null;
	const offset = filterOffset ? Math.abs(filterOffset) : 0;

	let filteredPeers = peers.reduce((prev, peer) => {
		const matchFilters =
			typeof otherFilters === 'object' && otherFilters !== null
				? otherFilters
				: {};
		const applicableFilters = Object.keys(matchFilters).filter(key =>
			allowedFields.includes(key),
		);
		if (
			applicableFilters.every(
				key => peer[key] !== undefined && peer[key] === matchFilters[key],
			)
		) {
			prev.push(peer);
		}
		return prev;
	}, []);

	// Sorting
	if (filters.sort) {
		const sortArray = String(filters.sort).split(':');
		const auxSortField = allowedFields.includes(sortArray[0])
			? sortArray[0]
			: null;
		const sortField = sortArray[0] ? auxSortField : null;
		const sortMethod = sortArray.length === 2 ? sortArray[1] !== 'desc' : true;
		if (sortField) {
			filteredPeers.sort(sortPeers(sortField, sortMethod));
		}
	} else {
		// Sort randomly by default
		filteredPeers = shuffle(filteredPeers);
	}

	// Apply limit if supplied
	if (limit) {
		return filteredPeers.slice(offset, offset + limit);
	}
	// Apply offset if supplied
	if (offset) {
		return filteredPeers.slice(offset);
	}

	return filteredPeers;
};

const consolidatePeers = (connectedPeers = [], disconnectedPeers = []) => {
	// Assign state 2 to the connected peers
	const connectedList = [...connectedPeers].map(peer => {
		const {
			ipAddress,
			options,
			minVersion,
			nethash,
			nonce,
			blockVersion,
			maxHeightPrevoted,
			lastBlockId,
			...restOfPeerObject
		} = peer;

		return { ip: ipAddress, ...restOfPeerObject, state: PEER_STATE_CONNECTED };
	});
	const disconnectedList = [...disconnectedPeers].map(peer => {
		const {
			ipAddress,
			options,
			minVersion,
			nethash,
			nonce,
			blockVersion,
			maxHeightPrevoted,
			lastBlockId,
			...restOfPeerObject
		} = peer;

		return {
			ip: ipAddress,
			...restOfPeerObject,
			state: PEER_STATE_DISCONNECTED,
		};
	});

	return [...connectedList, ...disconnectedList];
};

function calculateApproval(votersBalance, totalSupply) {
	// votersBalance and totalSupply are sent as strings,
	// we convert them into bignum and send the response as number as well
	const votersBalanceBignum = new BigNum(votersBalance || 0);
	const totalSupplyBignum = new BigNum(totalSupply);
	const approvalBignum = votersBalanceBignum
		.dividedBy(totalSupplyBignum)
		.times(100)
		.toFixed(2);

	return Number(parseFloat(approvalBignum).toFixed(2));
}

module.exports = {
	filterByParams,
	consolidatePeers,
	calculateApproval,
};
