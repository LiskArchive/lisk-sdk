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

import { InMemoryDatabase } from '@liskhq/lisk-db';
import { P2P } from '@liskhq/lisk-p2p';
import { utils } from '@liskhq/lisk-cryptography';
import { Network } from '../../../../src/engine/network';
import { fakeLogger } from '../../../utils/mocks';

jest.mock('@liskhq/lisk-p2p');
jest.mock('@liskhq/lisk-db');

describe('network', () => {
	let network: Network;
	jest.useFakeTimers();
	beforeEach(async () => {
		const db = new InMemoryDatabase();
		network = new Network({
			options: {
				version: '2.0',
				port: 3000,
				seedPeers: [],
			},
		});
		await network.init({
			logger: fakeLogger,
			chainID: utils.getRandomBytes(32),
			nodeDB: db as never,
		});
	});

	describe('getConnectedPeers', () => {
		describe('when peer does not have options', () => {
			it('should return peer info without options', () => {
				const expected = [
					{
						ipAddress: '1.1.1.1',
						port: 1000,
						chainID: 'networkId',
						networkVersion: '1.1',
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
				const id = '1a1032a53daf7a969ab8c93f4cdfab6d9f98ce22c69e6ee151ea1b46ea1b2ce4';
				const expected = [
					{
						ipAddress: '1.1.1.1',
						port: 1000,
						chainID: 'networkId',
						networkVersion: '1.1',
						nonce: 'nonce1',
						options: {
							height: 32,
							maxHeightPrevoted: 3,
							blockVersion: 1,
							lastBlockID: Buffer.from(id, 'hex'),
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
							lastBlockID: e.options.lastBlockID.toString('hex'),
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
						chainID: 'networkId',
						networkVersion: '1.1',
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
				const id = '1a1032a53daf7a969ab8c93f4cdfab6d9f98ce22c69e6ee151ea1b46ea1b2ce4';
				const expected = [
					{
						ipAddress: '1.1.1.1',
						port: 1000,
						chainID: 'networkId',
						networkVersion: '1.1',
						nonce: 'nonce1',
						options: {
							height: 32,
							maxHeightPrevoted: 3,
							blockVersion: 1,
							lastBlockID: Buffer.from(id, 'hex'),
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
							lastBlockID: e.options.lastBlockID.toString('hex'),
						},
					})),
				);
			});
		});

		describe('previousPeers', () => {
			const previousPeers = [
				{
					ipAddress: '127.0.0.10',
					port: 5000,
				},
				{
					ipAddress: '127.0.0.12',
					port: 5001,
				},
			];

			const previousPeersBuffer = Buffer.from(JSON.stringify(previousPeers), 'utf8');

			beforeEach(() => {
				network = new Network({
					options: {
						version: '2.0',
						port: 3000,
						seedPeers: [],
					},
				});
			});

			describe('Loading and saving previous peers on start up', () => {
				it('should load all the previous peers into p2p and save after 10 mins', async () => {
					const db = new InMemoryDatabase();
					jest.spyOn(db, 'get').mockResolvedValue(previousPeersBuffer);
					jest.spyOn(db, 'set');

					const parseSpy = jest.spyOn(JSON, 'parse');
					await network.init({
						logger: fakeLogger,
						chainID: utils.getRandomBytes(32),
						nodeDB: db as never,
					});
					await network.start();
					expect(parseSpy).toHaveBeenCalledWith(previousPeersBuffer.toString('utf8'));

					network['_p2p'] = {
						getTriedPeers: jest.fn().mockReturnValue(previousPeers),
					} as any;

					jest.advanceTimersByTime(600000);
					expect(db.set).toHaveBeenCalledTimes(1);
				});
			});
		});
	});
});
