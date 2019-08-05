/*
 * Copyright © 2019 Lisk Foundation
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

'use strict';

const rewire = require('rewire');

const Broadcaster = rewire(
	'../../../../../../src/modules/chain/transport/broadcaster',
);

describe('Broadcaster', () => {
	const nonce = 'sYHEDBKcScaAAAYg';
	const params = { limit: 10, broadhash: '123' };
	const options = {
		data: { peer: {}, block: {} },
		api: 'blocks',
		immediate: false,
	};
	let broadcaster;
	let broadcasts;
	let transactionPoolStub;
	let loggerStub;
	let jobsQueue;
	let channelStub;

	beforeEach(async () => {
		broadcasts = {
			active: true,
			broadcastInterval: 10000,
			releaseLimit: 10,
			parallelLimit: 10,
			relayLimit: 10,
		};

		loggerStub = {
			info: sinonSandbox.stub(),
			error: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
			trace: sinonSandbox.stub(),
		};

		channelStub = {
			invoke: sinonSandbox.stub().returns(),
		};

		transactionPoolStub = {
			transactionInPool: sinonSandbox.stub(),
		};

		jobsQueue = Broadcaster.__get__('jobsQueue');

		jobsQueue.register = sinonSandbox.stub();

		const storageStub = {
			entities: {
				Transaction: {
					isPersisted: sinonSandbox.stub().resolves(),
				},
			},
		};

		broadcaster = new Broadcaster(
			nonce,
			broadcasts,
			transactionPoolStub,
			loggerStub,
			channelStub,
			storageStub,
		);
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should throw error with no params', async () =>
			expect(() => {
				new Broadcaster();
			}).to.throw());

		it('should load libraries', async () => {
			expect(broadcaster.logger).to.deep.equal(loggerStub);
		});

		it('should return Broadcaster instance', async () => {
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

		it('should register jobsQueue', async () => {
			expect(jobsQueue.register.calledOnce).to.be.true;
			expect(jobsQueue.register.args[0][0]).to.equal('broadcasterReleaseQueue');
			// expect(jobsQueue.register.args[0][1]).to.equal(async () => broadcaster.releaseQueue());
			expect(jobsQueue.register.args[0][2]).to.equal(
				broadcasts.broadcastInterval,
			);
		});
	});

	describe('broadcast', () => {
		it('should invoke "network:emit" event', async () => {
			await broadcaster.broadcast(params, options);
			const wrappedData = {
				...options.data,
				nonce,
			};
			expect(channelStub.invoke).to.be.calledOnce;
			expect(channelStub.invoke).to.be.calledWithExactly('network:emit', {
				event: options.api,
				data: wrappedData,
			});
		});
	});

	describe('enqueue', () => {
		it('should throw error for no params', async () =>
			expect(() => {
				broadcaster.enqueue();
			})
				.to.throw()
				.to.be.instanceOf(Error));

		it('should push params and options to queue', async () => {
			const auxParams = {};
			const auxOptions = {};
			expect(broadcaster.enqueue(auxParams, auxOptions)).to.eql(1);
			return expect(broadcaster.enqueue(auxParams, auxOptions)).to.eql(2);
		});
	});

	describe('maxRelays', () => {
		it('should return true if exhausted', async () =>
			expect(broadcaster.maxRelays({ relays: 11 })).to.be.true);

		it('should return false if max relay is less than relay limit', async () =>
			expect(broadcaster.maxRelays({ relays: 9 })).to.be.false);
	});

	describe('filterQueue', () => {
		const validTransaction = { id: '321' };
		const validSignature = { transactionId: '123' };
		beforeEach(done => {
			broadcaster.queue = [];
			done();
		});

		describe('having one transaction broadcast in queue with immediate = true', () => {
			beforeEach(async () => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: validTransaction },
					immediate: true,
				});
				// ToDo: Why is enqueue overwriting immediate parameter with false?
				broadcaster.queue[0].options.immediate = true;
			});

			it('should set an empty broadcaster.queue and skip the broadcast', async () => {
				await broadcaster.filterQueue();
				expect(broadcaster.queue)
					.to.be.an('Array')
					.to.eql([]);
			});
		});

		describe('having one transaction broadcast in queue of transaction = undefined', () => {
			beforeEach(async () => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: undefined },
					immediate: true,
				});
			});

			it('should set an empty broadcaster.queue and skip the broadcast', async () => {
				await broadcaster.filterQueue();
				expect(broadcaster.queue)
					.to.be.an('Array')
					.to.eql([]);
			});
		});

		describe('having one signature broadcast in queue', () => {
			beforeEach(async () => {
				broadcaster.enqueue(params, {
					api: 'postSignatures',
					data: { signature: validSignature },
					immediate: false,
				});
			});

			it('should call transaction pool with [signature.transactionId]', async () => {
				await broadcaster.filterQueue();
				expect(transactionPoolStub.transactionInPool).calledWithExactly(
					validSignature.transactionId,
				);
			});
		});

		describe('having one transaction broadcast in queue', () => {
			let broadcast;
			beforeEach(async () => {
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
					},
				);
			});

			it('should call transaction pool with [transaction.id]', async () => {
				await broadcaster.filterQueue();
				expect(transactionPoolStub.transactionInPool).calledWithExactly(
					validTransaction.id,
				);
			});

			describe('when [validTransaction] exists in transaction pool', () => {
				beforeEach(async () => {
					transactionPoolStub.transactionInPool.returns(true);
				});
				it('should leave [broadcast] in broadcaster.queue', async () => {
					await broadcaster.filterQueue();
					expect(broadcaster.queue)
						.to.be.an('Array')
						.to.eql([broadcast]);
				});
			});

			describe('when [validTransaction] does not exist in transaction pool', () => {
				beforeEach(async () => {
					transactionPoolStub.transactionInPool.returns(false);
				});
				describe('when [validTransaction] is confirmed', () => {
					beforeEach(async () => {
						broadcaster.storage.entities.Transaction.isPersisted.resolves(true);
					});
					it('should set an empty broadcaster.queue and skip the broadcast', async () => {
						await broadcaster.filterQueue();
						expect(broadcaster.queue)
							.to.be.an('Array')
							.to.eql([]);
					});
				});
				describe('when [validTransaction] is not confirmed', () => {
					beforeEach(async () => {
						broadcaster.storage.entities.Transaction.isPersisted.resolves(
							false,
						);
					});
					it('should leave [broadcast] in broadcaster.queue', async () => {
						broadcaster.filterQueue(() => {
							expect(broadcaster.queue)
								.to.be.an('Array')
								.to.eql([broadcast]);
						});
					});
				});
				describe('when error occurs while checking if [validTransaction] is confirmed', () => {
					beforeEach(async () => {
						broadcaster.storage.entities.Transaction.isPersisted.rejects([]);
					});
					it('should set an empty broadcaster.queue and skip the broadcast', async () => {
						await broadcaster.filterQueue();
						expect(broadcaster.queue)
							.to.be.an('Array')
							.to.eql([]);
					});
				});
			});
		});

		describe('having many transaction and signatures broadcasts in queue', () => {
			const auxBroadcasts = [];
			beforeEach(async () => {
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
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 1 } },
								immediate: false,
							},
						},
					),
				);
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 2 } },
								immediate: false,
							},
						},
					),
				);
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 3 } },
								immediate: false,
							},
						},
					),
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
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postSignatures',
								data: { signature: { transactionId: 1 } },
								immediate: false,
							},
						},
					),
				);
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postSignatures',
								data: { signature: { transactionId: 2 } },
								immediate: false,
							},
						},
					),
				);
			});

			describe('when all of them exist in transaction pool', () => {
				beforeEach(async () => {
					transactionPoolStub.transactionInPool.returns(true);
				});
				it('should leave all of them in broadcaster.queue', async () => {
					await broadcaster.filterQueue();
					expect(broadcaster.queue)
						.to.be.an('Array')
						.to.eql(auxBroadcasts);
				});
			});

			describe('when all transactions are confirmed', () => {
				beforeEach(async () => {
					transactionPoolStub.transactionInPool.returns(false);
					broadcaster.storage.entities.Transaction.isPersisted.resolves(true);
				});

				it('should remove all of them from broadcaster.queue', async () => {
					await broadcaster.filterQueue();
					expect(broadcaster.queue)
						.to.be.an('Array')
						.to.eql([]);
				});
			});
		});
	});

	describe('squashQueue', () => {
		it('should return empty array for no params and empty object', async () => {
			expect(broadcaster.squashQueue({})).to.eql([]);
			return expect(broadcaster.squashQueue()).to.eql([]);
		});

		it('should be able to squash the queue', async () => {
			const auxBroadcasts = {
				broadcast: {
					options: { api: 'postTransactions', data: { peer: {}, block: {} } },
				},
			};
			return expect(broadcaster.squashQueue(auxBroadcasts)).to.eql([
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
		beforeEach(async () => {
			loggerStub.info = sinonSandbox.stub();
		});

		it('should return immediately for an empty queue', async () => {
			await broadcaster.releaseQueue();
			expect(loggerStub.trace.called).to.be.true;
			expect(loggerStub.trace.args[0][0]).to.be.eql(
				'Releasing enqueued broadcasts',
			);
			expect(loggerStub.trace.args[1][0]).to.be.eql('Queue empty');
		});

		it('should return error when failed to broadcast to queue', async () => {
			const filterQueueStub = sinonSandbox
				.stub()
				.rejects(new Error('failed to broadcast'));
			broadcaster.filterQueue = filterQueueStub;
			broadcaster.enqueue(params, options);
			return expect(broadcaster.releaseQueue()).to.eventually.be.rejectedWith(
				'failed to broadcast',
			);
		});
	});
});
