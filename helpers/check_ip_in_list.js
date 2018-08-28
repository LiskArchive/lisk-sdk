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
 * @param {boolean} returnListIsEmpty - The return value, if list is empty
 * @returns {boolean} True if ip is in the list, false otherwise
 */
function CheckIpInList(list, addr) {
	var i;
	if (!_.isArray(list) || list.length === 0) {
		return false;
	}
	if (!ip.isV4Format(addr)) {
		throw new TypeError('Provided address is not in IPv4 format');
	}
	for (i = 0; i < list.length; i++) {
		if (!ip.isV4Format(list[i])) {
			var message = `Entry with wrong format in list of IPs: ${list[i]}`;
			console.error('CheckIpInList:', message);
		} else if (ip.isEqual(list[i], addr)) {
			return true;
		}
	}
	return false;
}

module.exports = CheckIpInList;
