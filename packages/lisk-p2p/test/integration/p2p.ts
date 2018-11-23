import { P2P } from '../../src/index';

const NETWORK_PEER_COUNT: Number = 10;

describe('Integration tests for BlockchainP2P', () => {
	let blockchainP2PList: Array<P2P> = [];

	describe('Start and stop network', () => {
		beforeEach(async () => {
			blockchainP2PList = [...Array(NETWORK_PEER_COUNT).keys()].map(index => {
				return new P2P({
					peers: {
						enabled: true,
						list: [],
						access: {
							blacklist: [],
						},
						options: {
							broadhashConsensusCalculationInterval: 5000,
							timeout: 5000,
							wsEngine: 'sc-uws',
						},
					},
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
