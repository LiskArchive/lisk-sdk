/*
 * Copyright © 2020 Lisk Foundation
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

import { lookupPeersIPs } from '../../../../src/engine/network/utils';
import { peers } from './peers.json';

describe('init_steps/lookup_peers_ips', () => {
	const ipv4Regex = new RegExp(/^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/);

	it('should return empty array if peers are not enabled', async () => {
		const result = await lookupPeersIPs(peers.list, false);

		return expect(result).toEqual([]);
	});

	describe('for each peer', () => {
		let spyConsoleError: jest.SpyInstance;

		beforeEach(() => {
			spyConsoleError = jest.spyOn(console, 'error');
		});

		it('should throw error when failed to resolve hostname', async () => {
			await lookupPeersIPs([{ ip: 'https://lisk.com/', port: 4000 }], true);

			expect(spyConsoleError).toHaveBeenCalledTimes(1);
			return expect(spyConsoleError).toHaveBeenCalledWith(
				'Failed to resolve peer domain name https://lisk.com/ to an IP address',
			);
		});

		it('should resolve hostname to ip address', async () => {
			const resolvedIps = await lookupPeersIPs(peers.list, true);

			expect(resolvedIps).toHaveLength(peers.list.length);
			return resolvedIps.forEach(peer => {
				expect(ipv4Regex.test(peer.ip)).toBeTrue();
			});
		});
	});
});
