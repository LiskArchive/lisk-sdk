const net = require('net');
const dns = require('dns');
const util = require('util');

const lookupPromise = util.promisify(dns.lookup);

module.exports = async (peersList, enabled) => {
	// If peers layer is not enabled there is no need to create the peer's list
	if (!enabled) {
		return [];
	}

	// In case domain names are used, resolve those to IP addresses.
	peersList = await Promise.all(
		peersList.map(async peer => {
			if (net.isIPv4(peer.ip)) {
				return peer;
			}

			try {
				const address = await lookupPromise(peer.ip, { family: 4 });
				return Object.assign({}, peer, { ip: address });
			} catch (err) {
				console.error(
					`Failed to resolve peer domain name ${peer.ip} to an IP address`
				);
				return peer;
			}
		})
	);

	return peersList;
};
