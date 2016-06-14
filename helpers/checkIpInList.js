var ip = require('ip');

/*
	Checks if ip address is in list (e.g. whitelist, blacklist).
	
	@param list an array of ip addresses or ip subnets
	@param addr the ip address to check if in array
	@param returnListIsEmpty the return value, if list is empty (default: true)
	@returns true if ip is in the list, false otherwise
*/
function CheckIpInList (list, addr, returnListIsEmpty) {
	returnListIsEmpty = returnListIsEmpty || true;

	if (!list._subNets) { // First call, create subnet list
		list._subNets = [];
		for (var i = list.length - 1; i >= 0; i--) {
			var entry = list[i];
			if (ip.isV4Format(entry)) { // IPv4 host entry
				entry = entry + "/32";
			} else if (ip.isV6Format(entry)) { // IPv6 host entry
				entry = entry + "/128";
			}
			try {
				var subnet = ip.cidrSubnet(entry);
				list._subNets.push(subnet);
			} catch (err) {
				// Entry was not a valid ip address, log an error?
			}
		}
	}
	if (list._subNets.length == 0) {
		return returnListIsEmpty;
	}
	// Check subnets
	for (var i = 0, n = list._subNets.length; i < n; i++) {
		if (list._subNets[i].contains(addr)) {
			return true;
		}
	}

	// ip not found
	return false;
}

module.exports = CheckIpInList;
