import { expect } from 'chai';
import { P2P } from '../../src/index';
import { wait } from '../utils/helpers';

const NETWORK_START_PORT = 5000;

describe('Integration tests for P2P library', () => {
	const NETWORK_PEER_COUNT = 10;
	let p2pNodeList: ReadonlyArray<P2P> = [];

	describe('Disconnected network', () => {
		beforeEach(async () => {
			p2pNodeList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					seedPeers: [],
					wsEngine: 'ws',
					wsPort: NETWORK_START_PORT + index,
					version: '1.0.0',
				});
			});

			const peerStartPromises: ReadonlyArray<Promise<void>> = p2pNodeList.map(
				p2p => {
					return p2p.start();
				},
			);
			await Promise.all(peerStartPromises);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList.map(p2p => {
					return p2p.stop();
				}),
			);
		});

		it('should set the isActive property to true for all nodes', () => {
			p2pNodeList.forEach(p2p => {
				expect(p2p).to.have.property('isActive', true);
			});
		});
	});

	describe.skip('Fully connected network', () => {
		beforeEach(async () => {
			p2pNodeList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the next node in the sequence as a seed peer.
				const seedPeers = [
					{
						ipAddress: '127.0.0.1',
						wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
						height: 0,
					},
				];
				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					seedPeers,
					wsEngine: 'ws',
					wsPort: NETWORK_START_PORT + index,
					version: '1.0.0',
				});
			});

			const peerStartPromises: ReadonlyArray<Promise<void>> = p2pNodeList.map(
				blockchainP2P => {
					return blockchainP2P.start();
				},
			);

			await Promise.all(peerStartPromises);
			await wait(500);
			
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList.map(p2p => {
					return p2p.stop();
				}),
			);
		});

		describe('Peer discovery', () => {
			it('should discover seed peers', () => {
				// TODO: Check that nodes are running and connected to seed peers using p2p.getNetworkStatus()
				p2pNodeList.forEach(p2p => {
					let networkStatus = p2p.getNetworkStatus();
					console.log('NETWORK STATUS:', networkStatus);
				});
			});
		});
	});
});
