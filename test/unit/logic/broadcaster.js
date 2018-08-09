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
	let jobsQueue;
	let library;
	let nextRelease;
	let releaseQueue;
	let filterQueue;
	let filterTransaction;
	let squashQueue;
	const transactionData = {
		id: '16140284222734558289',
		rowId: 133,
		blockId: '1462190441827192029',
		type: 0,
		timestamp: 33363661,
		senderPublicKey:
			'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
		senderId: '16313739661670634666L',
		recipientId: '5649948960790668770L',
		amount: 8067474861277,
		fee: 10000000,
		signature:
			'7ff5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008',
		signSignature: null,
		requesterPublicKey: null,
		signatures: null,
		asset: {},
	};

	beforeEach(done => {
		broadcasts = {
			active: true,
			broadcastInterval: 10000,
			releaseLimit: 10,
			parallelLimit: 10,
			relayLimit: 10,
			broadcastLimit: 10,
		};

		peerList = [
			{
				rpc: {
					blocks: sinonSandbox.stub(),
				},
			},
		];

		peersStub = {
			me: sinonSandbox.stub().returns(['192.168.10.10']),
			listRandomConnected: sinonSandbox.stub().returns(peerList),
		};

		transactionStub = {
			checkConfirmed: sinonSandbox.stub().callsArgWith(1, false),
		};

		loggerStub = {
			info: sinonSandbox.stub(),
			error: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
		};

		modulesStub = {
			peers: {
				list: sinonSandbox.stub().callsArgWith(1, null, peerList),
				getLastConsensus: sinonSandbox.stub().returns(101),
			},
			transport: {},
			transactions: {
				transactionInPool: sinonSandbox.stub().returns(false),
			},
		};

		jobsQueue = Broadcaster.__get__('jobsQueue');

		jobsQueue.register = sinonSandbox.stub();

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
			modulesStub.transactions
		);

		library = Broadcaster.__get__('library');

		nextRelease = Broadcaster.__get__('nextRelease');
		releaseQueue = Broadcaster.__get__('__private.releaseQueue');
		filterQueue = Broadcaster.__get__('__private.filterQueue');
		filterTransaction = Broadcaster.__get__('__private.filterTransaction');
		squashQueue = Broadcaster.__get__('__private.squashQueue');

		done();
	});

	afterEach(() => {
		Broadcaster.__set__('__private.releaseQueue', releaseQueue);
		Broadcaster.__set__('nextRelease', nextRelease);
		Broadcaster.__set__('__private.releaseQueue', releaseQueue);
		Broadcaster.__set__('__private.filterQueue', filterQueue);
		Broadcaster.__set__('__private.filterTransaction', filterTransaction);
		Broadcaster.__set__('__private.squashQueue', squashQueue);
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should throw error with no params', () => {
			return expect(() => {
				new Broadcaster();
			}).to.throw();
		});

		it('should load libraries', () => {
			expect(library.logger).to.deep.eql(loggerStub);
			expect(library.logic.peers).to.deep.eql(peersStub);
			expect(library.config).to.deep.eql({
				broadcasts,
				forging: { force: true },
			});
			return expect(library.logic.transaction).to.deep.eql(transactionStub);
		});

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

		it('should register jobsQueue', () => {
			const nextRelease = Broadcaster.__get__('nextRelease');
			expect(jobsQueue.register.calledOnce).to.be.true;
			return expect(jobsQueue.register).calledWith(
				'broadcasterNextRelease',
				nextRelease,
				broadcasts.broadcastInterval
			);
		});
	});

	describe('getPeers', () => {
		it('should throw error for empty params', () => {
			return expect(() => {
				broadcaster.getPeers(null);
			}).to.throw();
		});

		it('should return peers for default params', done => {
			broadcaster.getPeers({}, (err, peers) => {
				expect(err).to.be.null;
				expect(peers).to.be.an('Array').that.is.not.empty;
				expect(peers).to.deep.eql(peerList);
				expect(peersStub.listRandomConnected.called).to.be.true;
				expect(peersStub.listRandomConnected.args[0][0]).to.not.eql(params);
				done();
			});
		});

		it('should return peer list for a given params', done => {
			broadcaster.getPeers(params, (err, peers) => {
				expect(err).to.be.null;
				expect(peers).to.be.an('Array').that.is.not.empty;
				expect(peers).to.deep.eql(peerList);
				expect(peersStub.listRandomConnected.calledOnce).to.be.true;
				done();
			});
		});

		it('should reach consensus', done => {
			const peerParams = _.cloneDeep(params);
			peerParams.limit = 100;
			broadcaster.getPeers(peerParams, () => {
				expect(peersStub.listRandomConnected.calledOnce).to.be.true;
				expect(peersStub.listRandomConnected.args[0][0]).to.deep.eql(
					peerParams
				);
				expect(peersStub.listRandomConnected.args[0][1]).to.not.be.a(
					'function'
				);
				done();
			});
		});
	});

	describe('broadcast', () => {
		beforeEach(done => {
			broadcaster.getPeers = sinonSandbox
				.stub()
				.callsArgWith(1, null, peerList);
			done();
		});

		it('should throw error for empty peers', done => {
			const peerErr = new Error('empty peer list');
			broadcaster.getPeers.callsArgWith(1, peerErr, []);
			broadcaster.broadcast(params, options, (err, res) => {
				expect(err).to.be.eql(peerErr);
				expect(res).to.be.an('object').that.is.not.empty;
				done();
			});
		});

		it('should return empty peers', done => {
			const peerParams = _.cloneDeep(params);
			peerParams.peers = [];
			broadcaster.broadcast(peerParams, options, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.be.an('object').that.is.not.empty;
				expect(res).to.deep.equal({ peers: [] });
				done();
			});
		});

		it('should be able to get peers for broadcast', done => {
			broadcaster.broadcast(params, options, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.be.an('object').that.is.not.empty;
				expect(res).to.deep.equal({ peers: peerList });
				expect(options.data.block).to.be.instanceOf(Object);
				done();
			});
		});

		it(`should only send to ${params.limit} peers`, done => {
			const limitedPeers = _.cloneDeep(params);
			limitedPeers.limit = 10;
			limitedPeers.peers = _.range(100).map(() => {
				return peerList[0];
			});
			broadcaster.broadcast(limitedPeers, options, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.be.an('object').that.is.not.empty;
				expect(res.peers.length).to.eql(broadcasts.broadcastLimit);
				done();
			});
		});

		it('should be able to broadcast block to peers', done => {
			params.peers = peerList;
			options.data.block = {};
			expect(options.data.block).to.be.an('object');
			broadcaster.broadcast(params, options, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.be.an('object').that.is.not.empty;
				expect(res).to.deep.equal({ peers: peerList });
				expect(options.data.block).to.be.instanceOf(Object);
				expect(peerList[0].rpc.blocks.called).to.be.true;
				expect(peerList[0].rpc.blocks.args[0][0].block).to.be.instanceOf(
					Object
				);
				done();
			});
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
			const releaseQueueSpy = sinonSandbox.stub().callsArgWith(0, null);
			Broadcaster.__set__('__private.releaseQueue', releaseQueueSpy);
			nextRelease(() => {
				expect(releaseQueueSpy.calledOnce).to.be.true;
				done();
			});
		});

		it('should log err when failed to release', done => {
			const releaseQueueSpy = sinonSandbox
				.stub()
				.callsArgWith(0, 'release error');
			Broadcaster.__set__('__private.releaseQueue', releaseQueueSpy);
			nextRelease(() => {
				expect(loggerStub.info.args[0][0]).to.eql('Broadcaster timer');
				expect(loggerStub.info.args[0][1]).to.eql('release error');
				expect(releaseQueueSpy.calledOnce).to.be.true;
				done();
			});
		});
	});

	describe('filterQueue', () => {
		beforeEach(done => {
			options.data.transaction = [transactionData];
			broadcaster.enqueue(params, options);
			done();
		});

		it('should return empty queue when option immediate is set to true', done => {
			options.immediate = true;
			filterQueue(() => {
				expect(broadcaster.queue)
					.to.be.an('Array')
					.to.eql([]);
				done();
			});
		});

		it('should be able to filter the transactions in pool', done => {
			modulesStub.transactions.transactionInPool.returns(true);
			const filterTransactionStub = sinonSandbox
				.stub()
				.callsArgWith(1, null, broadcasts);
			Broadcaster.__set__('__private.filterTransaction', filterTransactionStub);
			filterQueue(() => {
				expect(broadcaster.queue[0].options.data.transaction)
					.to.be.an('Array')
					.to.eql([transactionData]);
				expect(loggerStub.debug.args[0][0]).to.be.eql(
					`Broadcasts before filtering: ${broadcaster.queue.length}`
				);
				done();
			});
		});
	});

	describe('filterTransaction', () => {
		beforeEach(done => {
			modulesStub.transactions.transactionInPool.returns(true);
			done();
		});

		it('should return false if transaction is undefined', done => {
			filterTransaction(undefined, (err, status) => {
				expect(err).to.be.null;
				expect(status).to.be.false;
				done();
			});
		});

		it('should return false if transaction is not in pool', done => {
			modulesStub.transactions.transactionInPool.returns(false);
			filterTransaction({ id: '123' }, (err, status) => {
				expect(err).to.be.null;
				expect(status).to.be.true;
				done();
			});
		});

		it('should return true if transaction is in pool', done => {
			filterTransaction({ id: '123' }, (err, status) => {
				expect(err).to.be.null;
				expect(status).to.be.true;
				done();
			});
		});

		it('should return false if transaction is not confirmed', done => {
			modulesStub.transactions.transactionInPool.returns(false);
			transactionStub.checkConfirmed.callsArgWith(1, true);
			filterTransaction({ id: '123' }, (err, status) => {
				expect(err).to.be.null;
				expect(status).to.be.false;
				done();
			});
		});
	});

	describe('squashQueue', () => {
		it('should return empty array for no params and empty object', () => {
			expect(squashQueue({})).to.eql([]);
			return expect(squashQueue()).to.eql([]);
		});

		it('should be able to squash the queue', () => {
			const broadcasts = {
				broadcast: {
					options: { api: 'postTransactions', data: { peer: {}, block: {} } },
				},
			};
			return expect(squashQueue(broadcasts)).to.eql([
				{
					immediate: false,
					options: {
						api: 'postTransactions',
						data: {
							transactions: [],
						},
					},
				},
			]);
		});
	});

	describe('releaseQueue', () => {
		beforeEach(done => {
			broadcaster.getPeers = sinonSandbox
				.stub()
				.callsArgWith(1, null, peerList);
			broadcaster.broadcast = sinonSandbox
				.stub()
				.callsArgWith(1, null, { peers: peerList });
			loggerStub.info = sinonSandbox.stub();
			done();
		});

		it('should return immediately for an empty queue', done => {
			releaseQueue(() => {
				expect(loggerStub.info.called).to.be.true;
				expect(loggerStub.info.args[0][0]).to.be.eql(
					'Releasing enqueued broadcasts'
				);
				expect(loggerStub.info.args[1][0]).to.be.eql('Queue empty');
				done();
			});
		});

		it('should return error when failed to broadcast to queue', done => {
			const filterQueueStub = sinonSandbox
				.stub()
				.callsArgWith(0, 'failed to broadcast', null);
			Broadcaster.__set__('__private.filterQueue', filterQueueStub);
			broadcaster.enqueue(params, options);
			releaseQueue(() => {
				expect(loggerStub.error.args[0][0]).to.eql(
					'Failed to release broadcast queue'
				);
				expect(loggerStub.error.args[0][1]).to.eql('failed to broadcast');
				done();
			});
		});
	});
});
