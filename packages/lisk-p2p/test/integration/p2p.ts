import { P2P } from '../../src/index';

describe('Integration tests for P2P library', () => {
	const NETWORK_PEER_COUNT = 10;
	let blockchainP2PList: Array<P2P> = [];

	describe('Start and stop network', () => {
		beforeEach(async () => {
			blockchainP2PList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
				return new P2P({
					blacklistedPeers: [],
					connectTimeout: 5000,
					seedPeers: [],
					wsEngine: 'ws',
				});
			});

			let peerStartPromises: Array<Promise<void>> = blockchainP2PList.map(
				blockchainP2P => {
					return blockchainP2P.start();
				},
			);
			await Promise.all(peerStartPromises);
		});

		afterEach(async () => {
			await Promise.all(
				blockchainP2PList.map(p2p => {
					return p2p.stop();
				}),
			);
		});

		it('should launch a network of peers locally', () => {
			// TODO: Check that nodes are running.
		});
	});
});
