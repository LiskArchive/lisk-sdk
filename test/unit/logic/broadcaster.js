const rewire = require('rewire');

const Broadcaster = rewire('../../../logic/broadcaster');

describe('Broadcaster', () => {
	const force = true;
	const params = { limit: 10, broadhash: '123' };
	const options = {
		data: { peer: {}, block: {} },
		api: 'blocks',
		immediate: false,
	};
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
		const validTransaction = { id: '321' };
		const validSignature = { transactionId: '123' };
		beforeEach('having empty broadcasts queue', done => {
			broadcaster.queue = [];
			done();
		});

		describe('having one transaction broadcast in queue with immediate = true', () => {
			beforeEach(done => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: validTransaction },
					immediate: true,
				});
				// ToDo: Why is enqueue overwriting immediate parameter with false?
				broadcaster.queue[0].options.immediate = true;
				done();
			});

			it('should set an empty broadcaster.queue and skip the broadcast', done => {
				filterQueue(() => {
					expect(broadcaster.queue)
						.to.be.an('Array')
						.to.eql([]);
					done();
				});
			});
		});

		describe('having one transaction broadcast in queue of transaction = undefined', () => {
			beforeEach(done => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: undefined },
					immediate: true,
				});
				done();
			});

			it('should set an empty broadcaster.queue and skip the broadcast', done => {
				filterQueue(() => {
					expect(broadcaster.queue)
						.to.be.an('Array')
						.to.eql([]);
					done();
				});
			});
		});

		describe('having one signature broadcast in queue', () => {
			beforeEach(done => {
				broadcaster.enqueue(params, {
					api: 'postSignatures',
					data: { signature: validSignature },
					immediate: false,
				});
				done();
			});

			it('should call transaction pool with [signature.transactionId]', done => {
				filterQueue(() => {
					expect(modulesStub.transactions.transactionInPool).calledWithExactly(
						validSignature.transactionId
					);
					done();
				});
			});
		});

		describe('having one transaction broadcast in queue', () => {
			let broadcast;
			beforeEach(done => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: validTransaction },
					immediate: false,
				});
				broadcast = Object.assign(
					{},
					{ params },
					{
						options: {
							api: 'postTransactions',
							data: { transaction: validTransaction },
							immediate: false,
						},
					}
				);
				done();
			});

			it('should call transaction pool with [transaction.id]', done => {
				filterQueue(() => {
					expect(modulesStub.transactions.transactionInPool).calledWithExactly(
						validTransaction.id
					);
					done();
				});
			});

			describe('when [validTransaction] exists in transaction pool', () => {
				beforeEach(done => {
					modulesStub.transactions.transactionInPool.returns(true);
					done();
				});
				it('should leave [broadcast] in broadcaster.queue', done => {
					filterQueue(() => {
						expect(broadcaster.queue)
							.to.be.an('Array')
							.to.eql([broadcast]);
						done();
					});
				});
			});

			describe('when [validTransaction] does not exist in transaction pool', () => {
				beforeEach(done => {
					modulesStub.transactions.transactionInPool.returns(false);
					done();
				});
				describe('when [validTransaction] is confirmed', () => {
					beforeEach(done => {
						transactionStub.checkConfirmed.callsArgWith(1, null, true);
						done();
					});
					it('should set an empty broadcaster.queue and skip the broadcast', done => {
						filterQueue(() => {
							expect(broadcaster.queue)
								.to.be.an('Array')
								.to.eql([]);
							done();
						});
					});
				});
				describe('when [validTransaction] is not confirmed', () => {
					beforeEach(done => {
						transactionStub.checkConfirmed.callsArgWith(1, null, false);
						done();
					});
					it('should leave [broadcast] in broadcaster.queue', done => {
						filterQueue(() => {
							expect(broadcaster.queue)
								.to.be.an('Array')
								.to.eql([broadcast]);
							done();
						});
					});
				});
				describe('when error occurs while checking if [validTransaction] is confirmed', () => {
					beforeEach(done => {
						transactionStub.checkConfirmed.callsArgWith(
							1,
							'Checking if transction is confirmed error',
							false
						);
						done();
					});
					it('should set an empty broadcaster.queue and skip the broadcast', done => {
						filterQueue(() => {
							expect(broadcaster.queue)
								.to.be.an('Array')
								.to.eql([]);
							done();
						});
					});
				});
			});
		});

		describe('having many transaction and signatures broadcasts in queue', () => {
			const broadcasts = [];
			beforeEach(done => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: { id: 1 } },
					immediate: false,
				});
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: { id: 2 } },
					immediate: false,
				});
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: { id: 3 } },
					immediate: false,
				});
				broadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 1 } },
								immediate: false,
							},
						}
					)
				);
				broadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 2 } },
								immediate: false,
							},
						}
					)
				);
				broadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 3 } },
								immediate: false,
							},
						}
					)
				);
				broadcaster.enqueue(params, {
					api: 'postSignatures',
					data: { signature: { transactionId: 1 } },
					immediate: false,
				});
				broadcaster.enqueue(params, {
					api: 'postSignatures',
					data: { signature: { transactionId: 2 } },
					immediate: false,
				});
				broadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postSignatures',
								data: { signature: { transactionId: 1 } },
								immediate: false,
							},
						}
					)
				);
				broadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postSignatures',
								data: { signature: { transactionId: 2 } },
								immediate: false,
							},
						}
					)
				);
				done();
			});

			describe('when all of them exist in transaction pool', () => {
				beforeEach(done => {
					modulesStub.transactions.transactionInPool.returns(true);
					done();
				});
				it('should leave all of them in broadcaster.queue', done => {
					filterQueue(() => {
						expect(broadcaster.queue)
							.to.be.an('Array')
							.to.eql(broadcasts);
						done();
					});
				});
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
