'use strict';

var sinon = require('sinon');

var randomPeer = {
	'broadhash': '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
	'dappid': null,
	'height': 1,
	'ip': '40.40.40.40',
	'os': 'unknown',
	'port': 4000,
	'state': 2,
	'version': '0.0.0'
};

var modulesStub = {
	transport: {
		getFromPeer: sinon.stub().callsArgWith(2, null, {
			success: true,
			peer: randomPeer,
			body: {
				success: true, height: randomPeer.height, peers: [randomPeer]
			}
		}),
		getFromRandomPeer: sinon.stub().callsArgWith(1, null, {
			success: true,
			peer: randomPeer,
			body: {
				success: true, height: randomPeer.height, peers: [randomPeer]
			}
		}),
		headers: sinon.stub(),
		consensus: sinon.stub(),
		poorConsensus: sinon.stub(),
		getPeers: sinon.stub(),
		sandboxApi: sinon.stub(),
		onBind: sinon.stub(),
		onBlockchainReady: sinon.stub(),
		onSignature: sinon.stub(),
		onNewBlock: sinon.stub(),
		onUnconfirmedTransaction: sinon.stub(),
		onMessage: sinon.stub(),
		cleanup: sinon.stub()
	},
	peers: {
		accept: sinon.stub().returnsArg(0),
		acceptable: sinon.stub().returnsArg(0),
		list: sinon.stub(),
		ban: sinon.stub(),
		remove: sinon.stub(),
		update: sinon.stub(),
		sandboxApi: sinon.stub(),
		pingPeer: sinon.stub(),
		onBind: sinon.stub(),
		onBlockchainReady: sinon.stub(),
		onPeersReady: sinon.stub(),
		cleanup: sinon.stub()
	},
	blocks: {
		count: sinon.stub(),
		getLastBlock: sinon.stub().returns({
			height: 1
		}),
		lastReceipt: sinon.stub(),
		getCommonBlock: sinon.stub(),
		loadBlocksFromPeer: sinon.stub(),
		loadBlocksData: sinon.stub(),
		loadBlocksPart: sinon.stub(),
		loadBlocksOffset: sinon.stub(),
		deleteLastBlock: sinon.stub(),
		loadLastBlock: sinon.stub(),
		generateBlock: sinon.stub(),
		processBlock: sinon.stub(),
		verifyBlock: sinon.stub(),
		deleteBlocksBefore: sinon.stub(),
		deleteAfterBlock: sinon.stub(),
		sandboxApi: sinon.stub(),
		onReceiveBlock: sinon.stub(),
		onBind: sinon.stub(),
		cleanup: sinon.stub(),
		aggregateBlocksReward: sinon.stub()
	}
};

module.exports = {
	randomPeer: randomPeer,
	modulesStub: modulesStub
};
