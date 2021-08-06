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

import { isIPv4 } from 'net';
import { lookup, LookupOptions } from 'dns';

interface SeedPeerInfo {
	readonly ip: string;
	readonly port: number;
}

const lookupPromise = async (hostname: string, options: LookupOptions): Promise<unknown> =>
	new Promise((resolve, reject) => {
		lookup(hostname, options, (err, address) => {
			if (err) {
				return reject(err);
			}

			return resolve(address);
		});
	});

export const lookupPeersIPs = async (
	peersList: ReadonlyArray<SeedPeerInfo>,
	enabled: boolean,
): Promise<ReadonlyArray<SeedPeerInfo>> => {
	// If peers layer is not enabled there is no need to create the peer's list
	if (!enabled) {
		return [];
	}

	// In case domain names are used, resolve those to IP addresses.
	return Promise.all(
		peersList.map(async (peer: SeedPeerInfo) => {
			const { ip } = peer;
			if (isIPv4(ip)) {
				return peer;
			}

			try {
				const address = await lookupPromise(ip, { family: 4 });
				return {
					...peer,
					ip: address as string,
				};
			} catch (err) {
				console.error(`Failed to resolve peer domain name ${ip} to an IP address`);
				return peer;
			}
		}),
	);
};
