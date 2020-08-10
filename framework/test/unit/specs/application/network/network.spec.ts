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

import { KVStore } from '@liskhq/lisk-db';
import { P2P } from '@liskhq/lisk-p2p';
import { Network } from '../../../../../src/application/network';
import { Logger } from '../../../../../src/application/logger';
import { InMemoryChannel } from '../../../../../src/controller';

jest.mock('@liskhq/lisk-p2p');
jest.mock('@liskhq/lisk-db');

describe('network', () => {
	let network: Network;

	beforeEach(() => {
		const db = new KVStore('~/.lisk/stubed');
		network = new Network({
			nodeDB: db,
			networkVersion: '2.0',
			logger: ({
				info: jest.fn(),
				error: jest.fn(),
				warn: jest.fn(),
				level: jest.fn(),
				debug: jest.fn(),
				trace: jest.fn(),
			} as unknown) as Logger,
			channel: ({} as unknown) as InMemoryChannel,
			options: {
				port: 3000,
				seedPeers: [],
			},
		});
	});

	describe('getConnectedPeers', () => {
		describe('when peer does not have options', () => {
			it('should return peer info without options', () => {
				const expected = [
					{
						ipAddress: '1.1.1.1',
						port: 1000,
						networkId: 'networkId',
						networVersion: '1.1',
						nonce: 'nonce1',
					},
				];
				network['_p2p'] = ({
					getConnectedPeers: jest.fn().mockReturnValue(expected),
				} as unknown) as P2P;

				const peers = network.getConnectedPeers();

				expect(peers).toEqual(expected);
			});
		});

		describe('when peer does have options', () => {
			it('should return decoded peer info in JSON format', () => {
				const id = 'GhAypT2vepaauMk/TN+rbZ+YziLGnm7hUeobRuobLOQ=';
				const expected = [
					{
						ipAddress: '1.1.1.1',
						port: 1000,
						networkId: 'networkId',
						networVersion: '1.1',
						nonce: 'nonce1',
						options: {
							height: 32,
							maxHeightPrevoted: 3,
							blockVersion: 1,
							lastBlockID: Buffer.from(id, 'base64'),
						},
					},
				];
				network['_p2p'] = ({
					getConnectedPeers: jest.fn().mockReturnValue(expected),
				} as unknown) as P2P;

				const peers = network.getConnectedPeers();

				expect(peers).toEqual(
					expected.map(e => ({
						...e,
						options: {
							...e.options,
							lastBlockID: e.options.lastBlockID.toString('base64'),
						},
					})),
				);
			});
		});
	});

	describe('getDisconnectedPeers', () => {
		describe('when peer does not have options', () => {
			it('should return peer info without options', () => {
				const expected = [
					{
						ipAddress: '1.1.1.1',
						port: 1000,
						networkId: 'networkId',
						networVersion: '1.1',
						nonce: 'nonce1',
					},
				];
				network['_p2p'] = ({
					getDisconnectedPeers: jest.fn().mockReturnValue(expected),
				} as unknown) as P2P;

				const peers = network.getDisconnectedPeers();

				expect(peers).toEqual(expected);
			});
		});

		describe('when peer does have options', () => {
			it('should return decoded peer info in JSON format', () => {
				const id = 'GhAypT2vepaauMk/TN+rbZ+YziLGnm7hUeobRuobLOQ=';
				const expected = [
					{
						ipAddress: '1.1.1.1',
						port: 1000,
						networkId: 'networkId',
						networVersion: '1.1',
						nonce: 'nonce1',
						options: {
							height: 32,
							maxHeightPrevoted: 3,
							blockVersion: 1,
							lastBlockID: Buffer.from(id, 'base64'),
						},
					},
				];
				network['_p2p'] = ({
					getDisconnectedPeers: jest.fn().mockReturnValue(expected),
				} as unknown) as P2P;

				const peers = network.getDisconnectedPeers();

				expect(peers).toEqual(
					expected.map(e => ({
						...e,
						options: {
							...e.options,
							lastBlockID: e.options.lastBlockID.toString('base64'),
						},
					})),
				);
			});
		});
	});
});
