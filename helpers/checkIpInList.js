'use strict';

var _ = require('lodash');
var ip = require('ip');

/**
 * Checks if ip address is in list (e.g. whitelist, blacklist).
 * @memberof module:helpers
 * @function
 * @param {array} list - An array of ip addresses or ip subnets.
 * @param {string} addr - The ip address to check if in array.
 * @param {boolean} returnListIsEmpty - The return value, if list is empty.
 * @return {boolean} True if ip is in the list, false otherwise.
 */
function CheckIpInList (list, addr, returnListIsEmpty) {
	var i, n;

	if (!_.isBoolean(returnListIsEmpty)) {
		returnListIsEmpty = true;
	}

	if (!_.isArray(list) || list.length === 0) {
		return returnListIsEmpty;
	}

	if (!list._subNets) { // First call, create subnet list
		list._subNets = [];
		for (i = list.length - 1; i >= 0; i--) {
			var entry = list[i];
			if (ip.isV4Format(entry)) { // IPv4 host entry
				entry = entry + '/32';
			} else if (ip.isV6Format(entry)) { // IPv6 host entry
				entry = entry + '/128';
			}
			try {
				var subnet = ip.cidrSubnet(entry);
				list._subNets.push(subnet);
			} catch (err) {
				console.error('CheckIpInList:', err.toString());
			}
		}
	}

	if (list._subNets.length === 0) {
		return returnListIsEmpty;
	}

	// Check subnets
	for (i = 0, n = list._subNets.length; i < n; i++) {
		if (list._subNets[i].contains(addr)) {
			return true;
		}
	}

	// IP address not found
	return false;
}

module.exports = CheckIpInList;
