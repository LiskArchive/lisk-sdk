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
const { shuffle } = require('lodash');

/**
 * Sorts peers.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */

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

/**
 * Returns peers length by filter but without offset and limit.
 * @param {Array} peers
 * @param {Object} filter
 * @returns {int} count
 * @todo Add description for the params
 */
const getByFilter = (peers, filter) => {
	const allowedFields = [
		'ip',
		'wsPort',
		'httpPort',
		'state',
		'os',
		'version',
		'protocolVersion',
		'broadhash',
		'height',
		'nonce',
	];
	const limit = filter.limit ? Math.abs(filter.limit) : null;
	const offset = filter.offset ? Math.abs(filter.offset) : 0;

	let filteredPeers = peers.filter(peer => {
		let passed = true;
		Object.entries(filter).forEach((key, value) => {
			// Every filter field need to be in allowed fields, exists and match value
			if (
				allowedFields.includes(key) &&
				!(peer[key] !== undefined && peer[key] === value)
			) {
				passed = false;
				return false;
			}
			return true;
		});
		return passed;
	});

	// Sorting
	if (filter.sort) {
		const sortArray = String(filter.sort).split(':');
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

/**
 * Returns peers length by filter but without offset and limit.
 * @param {Array} peers
 * @param {Object} filter
 * @returns {int} count
 * @todo Add description for the params
 */
const getCountByFilter = (peers, filter) => {
	const { limit, offset, ...filterWithoutLimitOffset } = filter;
	const peersWithoutLimitOffset = getByFilter(peers, filterWithoutLimitOffset);

	return peersWithoutLimitOffset.length;
};

module.exports = {
	getByFilter,
	getCountByFilter,
};
