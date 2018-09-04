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
var ip = require('ip');

/**
 * Checks if ip address is in list (e.g. whitelist, blacklist).
 *
 * @memberof helpers
 * @param {Array} list - An array of ip addresses or ip subnets
 * @param {string} addr - The ip address to check if in array
 * @returns {boolean} True if ip is in the list, false otherwise
 */
function CheckIpInList(list, addr) {
	var entry;
	if (!_.isArray(list) || list.length === 0) {
		return false;
	}
	for (let i = 0; i < list.length; i++) {
		entry = list[i];
		if (ip.isV4Format(entry)) {
			// IPv4 host entry
			entry += '/32';
		} else if (ip.isV6Format(entry)) {
			// IPv6 host entry
			entry += '/128';
		}
		try {
			entry = ip.cidrSubnet(entry);
			if (entry.contains(addr)) {
				return true;
			}
		} catch (err) {
			console.error('CheckIpInList:', err.toString());
		}
	}
	return false;
}

module.exports = CheckIpInList;
