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

const net = require('net');
const dns = require('dns');

const lookupPromise = (hostname, options) =>
	new Promise((resolve, reject) => {
		dns.lookup(hostname, options, (err, address) => {
			if (err) {
				return reject(err);
			}

			return resolve(address);
		});
	});

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
				return {
					...peer,
					ip: address,
				};
			} catch (err) {
				console.error(
					`Failed to resolve peer domain name ${peer.ip} to an IP address`,
				);
				return peer;
			}
		}),
	);

	return peersList;
};
