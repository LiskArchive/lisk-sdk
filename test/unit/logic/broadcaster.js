const rewire = require('rewire');

const Broadcaster = rewire('../../../logic/broadcaster');

describe('Broadcaster', () => {
	const force = true;
	const params = { limit: 10, broadhash: '123' };
	const options = { data: { peer: {}, block: {} }, api: 'blocks' };
	let broadcaster;
	let broadcasts;
	let transactionStub;
	let peersStub;
	let loggerStub;
	let modulesStub;
	let peerList;

	before(done => {
		broadcasts = {
			broadcastInterval: 10000,
			releaseLimit: 10,
		};

		peersStub = {
			me: sinonSandbox.stub().returns(['192.168.10.10']),
		};

		transactionStub = {
			checkConfirmed: sinonSandbox.stub(),
		};

		loggerStub = {
			info: sinonSandbox.stub(),
			error: sinonSandbox.stub(),
		};

		peerList = [
			{
				rpc: {
					blocks: sinonSandbox
						.stub()
						.callsArgWith(1, new Error('err'))
						.returns(),
				},
			},
		];

		modulesStub = {
			peers: {
				list: sinonSandbox.stub().callsArgWith(1, null, peerList),
				getLastConsensus: sinonSandbox.stub(),
			},
			transport: {},
			transactions: {
				transactionInPool: sinonSandbox.stub().returns(true),
			},
		};

		broadcaster = new Broadcaster(
			broadcasts,
			force,
			peersStub,
			transactionStub,
			loggerStub
		);
		broadcaster.bind(
			modulesStub.peers,
			modulesStub.transport,
			modulesStub.transaction
		);
		done();
	});

	describe('constructor', () => {
		it('should return Broadcaster instance', () => {
			expect(broadcaster).to.be.instanceOf(Broadcaster);
			expect(broadcaster)
				.to.have.property('queue')
				.that.is.an('Array');
			expect(broadcaster)
				.to.have.property('config')
				.that.is.an('object');
			return expect(broadcaster)
				.to.have.property('routes')
				.that.is.an('Array');
		});
	});

	describe('enqueue', () => {
		it('should throw error for no params', () => {
			return expect(() => {
				broadcaster.enqueue();
			})
				.to.throw()
				.to.be.instanceOf(Error);
		});

		it('should push params and options to queue', () => {
			const params = {};
			const options = {};
			expect(broadcaster.enqueue(params, options)).to.eql(1);
			return expect(broadcaster.enqueue(params, options)).to.eql(2);
		});
	});

	describe('getPeers', () => {
		it('should return peers', done => {
			broadcaster.getPeers(params, (err, peers) => {
				expect(err).to.be.null;
				expect(peers).to.be.an('Array').that.is.not.empty;
				done();
			});
		});
	});

	describe('broadcast', () => {
		it('should be able to broadcast block to peers', done => {
			modulesStub.peers.list.callsArgWith(1, null, peerList);
			broadcaster.broadcast(params, options, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.be.an('object').that.is.not.empty;
				expect(res).to.deep.equal({ body: null, peer: peerList });
				done();
			});
		});

		it('should throw error for empty peers', done => {
			const err = new Error('empty peer list');
			modulesStub.peers.list.callsArgWith(1, err, []);
			broadcaster.broadcast(params, options, (err, res) => {
				expect(err).to.be.eql(err);
				expect(res).to.be.an('object').that.is.not.empty;
				done();
			});
		});
	});

	describe('maxRelays', () => {
		it('should return true if exhausted', () => {
			return expect(broadcaster.maxRelays({ relays: 11 })).to.be.true;
		});

		it('should return false if max relay is less than relay limit', () => {
			return expect(broadcaster.maxRelays({ relays: 9 })).to.be.false;
		});
	});

	describe('nextRelease', () => {
		it('should be able to invoke next release', done => {
			const nextRelease = Broadcaster.__get__('nextRelease');
			nextRelease(() => {
				done();
			});
		});
	});
});
