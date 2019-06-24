/*
 * Copyright © 2018 Lisk Foundation
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
const chai = require('chai');
const {
	Status: TransactionStatus,
	TransferTransaction,
} = require('@liskhq/lisk-transactions');
const { transfer, TransactionError } = require('@liskhq/lisk-transactions');

const accountFixtures = require('../../../../fixtures/accounts');
const Bignum = require('../../../../../../src/modules/chain/helpers/bignum');
const Block = require('../../../../fixtures/blocks').Block;
const {
	registeredTransactions,
} = require('../../../../common/registered_transactions');
const InitTransaction = require('../../../../../../src/modules/chain/logic/init_transaction');
const ProcessTransactions = require('../../../../../../src/modules/chain/submodules/process_transactions');
const processTransactionLogic = require('../../../../../../src/modules/chain/logic/process_transaction');

const initTransaction = new InitTransaction({ registeredTransactions });

const TransportModule = rewire(
	'../../../../../../src/modules/chain/submodules/transport'
);

const { MAX_SHARED_TRANSACTIONS } = __testContext.config.constants;
const expect = chai.expect;

// TODO: Sometimes the callback error is null, other times it's undefined. It should be consistent.
describe('transport', () => {
	let storageStub;
	let loggerStub;
	let busStub;
	let schemaStub;
	let channelStub;
	let balancesSequenceStub;
	let blockStub;
	let broadcasterStubRef;
	let transportInstance;
	let library;
	let __private;
	let modules;
	let defaultScope;
	let restoreRewiredTopDeps;
	let transaction;
	let block;
	let blocksList;
	let transactionsList;
	let multisignatureTransactionsList;
	let blockMock;
	let error;
	let definitions;

	const SAMPLE_SIGNATURE_1 = {
		transactionId: '222675625422353767',
		publicKey:
			'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
		signature:
			'32636139613731343366633732316664633534306665663839336232376538643634386432323838656661363165353632363465646630316132633233303739',
	};

	const SAMPLE_SIGNATURE_2 = {
		transactionId: '222675625422353768',
		publicKey:
			'3ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23080',
		signature:
			'61383939393932343233383933613237653864363438643232383865666136316535363236346564663031613263323330373784192003750382840553137595',
	};

	beforeEach(async () => {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

		transaction = transfer({
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});
		const transactionOne = transfer({
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});
		const transactionTwo = transfer({
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});

		blockMock = new Block();

		transactionsList = [transactionOne, transactionTwo];

		multisignatureTransactionsList = [
			{
				id: '222675625422353767',
				type: 0,
				amount: '100',
				fee: '10',
				senderPublicKey:
					'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
				recipientId: '12668885769632475474L',
				timestamp: 28227090,
				asset: {},
				signatures: [
					'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
				],
			},
			{
				id: '332675625422353892',
				type: 0,
				amount: '1000',
				fee: '10',
				senderPublicKey:
					'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
				recipientId: '12668885769632475474L',
				timestamp: 28227090,
				asset: {},
				signatures: [
					'1231d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c567',
					'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
				],
			},
		];

		storageStub = {
			query: sinonSandbox.spy(),
		};

		loggerStub = {
			debug: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
		};

		busStub = {};
		schemaStub = {};
		channelStub = {
			publish: sinonSandbox.stub(),
		};
		balancesSequenceStub = {
			add: async () => {},
		};

		blockStub = {};

		restoreRewiredTopDeps = TransportModule.__set__({
			// eslint-disable-next-line object-shorthand
			Broadcaster: function() {
				this.bind = async () => {};
				broadcasterStubRef = this;
			},
		});

		definitions = TransportModule.__get__('definitions');

		defaultScope = {
			logic: {
				block: blockStub,
				initTransaction,
			},
			components: {
				storage: storageStub,
				logger: loggerStub,
			},
			bus: busStub,
			schema: schemaStub,
			channel: channelStub,
			applicationState: {},
			balancesSequence: balancesSequenceStub,
			config: {
				network: {
					options: {
						timeout: 1234,
					},
				},
				forging: {},
				broadcasts: {
					active: true,
					broadcastInterval: 10000,
					releaseLimit: 10,
				},
				httpPort: 8000,
			},
			modules: {
				blocks: {
					lastBlock: {
						get: sinonSandbox
							.stub()
							.returns({ height: 1, version: 1, timestamp: 1 }),
					},
				},
			},
		};
	});

	afterEach(done => {
		restoreRewiredTopDeps();
		sinonSandbox.restore();
		done();
	});

	describe('constructor', () => {
		describe('library', () => {
			let localTransportInstance;
			let transportSelf;

			beforeEach(done => {
				localTransportInstance = new TransportModule((err, transport) => {
					error = err;
					transportSelf = transport;
					library = TransportModule.__get__('library');
					__private = TransportModule.__get__('__private');

					done();
				}, defaultScope);
			});

			it('should assign scope variables when instantiating', async () => {
				expect(library)
					.to.have.property('storage')
					.which.is.equal(storageStub);
				expect(library)
					.to.have.property('logger')
					.which.is.equal(loggerStub);
				expect(library)
					.to.have.property('bus')
					.which.is.equal(busStub);
				expect(library)
					.to.have.property('schema')
					.which.is.equal(schemaStub);
				expect(library)
					.to.have.property('channel')
					.which.is.equal(channelStub);
				expect(library)
					.to.have.property('balancesSequence')
					.which.is.equal(balancesSequenceStub);
				expect(library)
					.to.have.nested.property('logic.block')
					.which.is.equal(blockStub);

				expect(__private)
					.to.have.property('broadcaster')
					.which.is.equal(broadcasterStubRef);

				expect(error).to.equal(null);
				return expect(transportSelf).to.equal(localTransportInstance);
			});
		});
	});

	describe('__private', () => {
		let __privateOriginal;
		let restoreRewiredDeps;

		beforeEach(done => {
			__privateOriginal = {};

			transportInstance = new TransportModule(() => {
				// Backup the __private variable so that properties can be overridden
				// by individual test cases and then we will restore them after each test case has run.
				// This is neccessary because different test cases may want to stub out different parts of the
				// __private modules while testing other parts.
				__private = TransportModule.__get__('__private');

				Object.keys(__private).forEach(field => {
					__privateOriginal[field] = __private[field];
				});

				library = {
					schema: {
						validate: sinonSandbox.stub().callsArg(2),
					},
					logger: {
						debug: sinonSandbox.spy(),
					},
					logic: {
						initTransaction,
					},
					channel: {
						publish: sinonSandbox.stub().resolves(),
					},
					applicationState: {
						broadhash:
							'81a410c4ff35e6d643d30e42a27a222dbbfc66f1e62c32e6a91dd3438defb70b',
					},
				};

				modules = {
					transactions: {
						processUnconfirmedTransaction: sinonSandbox.stub().callsArg(2),
					},
					processTransactions: new ProcessTransactions(() => {}, defaultScope),
				};
				modules.processTransactions.onBind(defaultScope);

				restoreRewiredDeps = TransportModule.__set__({
					library,
					modules,
					definitions,
				});

				done();
			}, defaultScope);
		});

		afterEach(done => {
			Object.keys(__private).forEach(field => {
				delete __private[field];
			});
			Object.keys(__privateOriginal).forEach(field => {
				__private[field] = __privateOriginal[field];
			});
			restoreRewiredDeps();
			done();
		});

		describe('receiveSignatures', () => {
			describe('for every signature in signatures', () => {
				describe('when __private.receiveSignature succeeds', () => {
					beforeEach(done => {
						__private.receiveSignature = sinonSandbox.stub().callsArg(1);
						__private.receiveSignatures([
							SAMPLE_SIGNATURE_1,
							SAMPLE_SIGNATURE_2,
						]);
						done();
					});

					it('should call __private.receiveSignature with signature', async () => {
						expect(__private.receiveSignature.calledTwice).to.be.true;
						expect(__private.receiveSignature.calledWith(SAMPLE_SIGNATURE_1)).to
							.be.true;
						return expect(
							__private.receiveSignature.calledWith(SAMPLE_SIGNATURE_2)
						).to.be.true;
					});
				});

				describe('when __private.receiveSignature fails', () => {
					let receiveSignatureError;

					beforeEach(done => {
						receiveSignatureError = 'Error processing signature: Error message';
						__private.receiveSignature = sinonSandbox
							.stub()
							.callsArgWith(1, receiveSignatureError);
						__private.receiveSignatures([
							SAMPLE_SIGNATURE_1,
							SAMPLE_SIGNATURE_2,
						]);
						done();
					});

					it('should call library.logger.debug with err and signature', async () => {
						// If any of the __private.receiveSignature calls fail, the rest of
						// the batch should still be processed.
						expect(__private.receiveSignature.calledTwice).to.be.true;
						expect(
							library.logger.debug.calledWith(
								receiveSignatureError,
								SAMPLE_SIGNATURE_1
							)
						).to.be.true;
						return expect(
							library.logger.debug.calledWith(
								receiveSignatureError,
								SAMPLE_SIGNATURE_2
							)
						).to.be.true;
					});
				});
			});
		});

		describe('receiveSignature', () => {
			beforeEach(done => {
				library.schema = {
					validate: sinonSandbox.stub().callsArg(2),
				};

				modules.multisignatures = {
					getTransactionAndProcessSignature: sinonSandbox.stub().callsArg(1),
				};

				done();
			});

			describe('when library.schema.validate succeeds', () => {
				describe('when modules.multisignatures.processSignature succeeds', () => {
					beforeEach(done => {
						modules.multisignatures.getTransactionAndProcessSignature = sinonSandbox
							.stub()
							.callsArg(1);

						__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
							error = err;
							done();
						});
					});

					it('should call library.schema.validate with signature', async () => {
						expect(error).to.equal(undefined);
						expect(library.schema.validate.calledOnce).to.be.true;
						return expect(
							library.schema.validate.calledWith(SAMPLE_SIGNATURE_1)
						).to.be.true;
					});

					it('should call modules.multisignatures.processSignature with signature', async () => {
						expect(error).to.equal(undefined);
						return expect(
							modules.multisignatures.getTransactionAndProcessSignature.calledWith(
								SAMPLE_SIGNATURE_1
							)
						).to.be.true;
					});

					it('should call callback with error = undefined', async () =>
						expect(error).to.equal(undefined));
				});

				describe('when modules.multisignatures.processSignature fails', () => {
					let processSignatureError;

					beforeEach(done => {
						processSignatureError = new TransactionError(
							'Transaction not found'
						);
						modules.multisignatures.getTransactionAndProcessSignature = sinonSandbox
							.stub()
							.callsArgWith(1, [processSignatureError]);

						__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
							error = err;
							done();
						});
					});

					it('should call callback with error', async () =>
						expect(error[0].message).to.equal(
							`${processSignatureError.message}`
						));
				});
			});

			describe('when library.schema.validate fails', () => {
				let validateErr;

				beforeEach(done => {
					validateErr = new Error('Signature did not match schema');
					validateErr.code = 'INVALID_FORMAT';
					library.schema.validate = sinonSandbox
						.stub()
						.callsArgWith(2, [validateErr]);

					__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
						error = err;
						done();
					});
				});

				it('should call callback with error = "Invalid signature body"', async () =>
					expect(error[0].message).to.equal(`${validateErr.message}`));
			});
		});

		describe('receiveTransactions', () => {
			beforeEach(done => {
				library.schema = {
					validate: sinonSandbox.stub().callsArg(2),
				};
				library.logger = {
					debug: sinonSandbox.spy(),
				};

				__private.receiveTransaction = sinonSandbox.stub().callsArg(2);

				done();
			});

			describe('when transactions argument is undefined', () => {
				beforeEach(done => {
					__private.receiveTransactions(undefined, '');
					done();
				});

				// If a single transaction within the batch fails, it is not going to
				// send back an error.
				it('should should not call __private.receiveTransaction', async () =>
					expect(__private.receiveTransaction.notCalled).to.be.true);
			});

			describe('for every transaction in transactions', () => {
				describe('when transaction is defined', () => {
					describe('when call __private.receiveTransaction succeeds', () => {
						beforeEach(done => {
							__private.receiveTransactions(
								transactionsList,
								'This is a log message'
							);
							done();
						});

						it('should set transaction.bundled = true', async () =>
							expect(transactionsList[0])
								.to.have.property('bundled')
								.which.equals(true));

						it('should call __private.receiveTransaction with transaction with transaction, peer and extraLogMessage arguments', async () =>
							expect(
								__private.receiveTransaction.calledWith(
									transactionsList[0],
									'This is a log message'
								)
							).to.be.true);
					});

					describe('when call __private.receiveTransaction fails', () => {
						let receiveTransactionError;

						beforeEach(done => {
							receiveTransactionError = 'Invalid transaction body - ...';
							__private.receiveTransaction = sinonSandbox
								.stub()
								.callsArgWith(2, receiveTransactionError);

							__private.receiveTransactions(
								transactionsList,
								'This is a log message'
							);
							done();
						});

						it('should call library.logger.debug with error and transaction', async () =>
							expect(
								library.logger.debug.calledWith(
									receiveTransactionError,
									transactionsList[0]
								)
							).to.be.true);
					});
				});
			});
		});

		describe('receiveTransaction', () => {
			beforeEach(done => {
				sinonSandbox
					.stub(balancesSequenceStub, 'add')
					.callsFake((callback, doneCallback) => {
						callback(doneCallback);
					});

				library.logic = {
					initTransaction,
				};
				library.schema = {
					validate: sinonSandbox.stub().callsArg(2),
				};
				library.logger = {
					debug: sinonSandbox.spy(),
				};
				library.balancesSequence = balancesSequenceStub;

				modules.transactions.processUnconfirmedTransaction = sinonSandbox
					.stub()
					.callsArg(2);
				done();
			});

			afterEach(() => sinonSandbox.restore());

			it('should composeProcessTransactionsSteps with checkAllowedTransactions and validateTransactions', done => {
				sinonSandbox.spy(processTransactionLogic, 'composeTransactionSteps');

				__private.receiveTransaction(
					transaction,
					'This is a log message',
					async () => {
						expect(
							processTransactionLogic.composeTransactionSteps
						).to.have.been.calledWith(
							modules.processTransactions.checkAllowedTransactions,
							modules.processTransactions.validateTransactions
						);
						done();
					}
				);
			});

			it('should call composedTransactionsCheck an array of transactions', done => {
				const composedTransactionsCheck = sinonSandbox.stub().returns({
					transactionsResponses: [
						{
							id: transaction.id,
							status: TransactionStatus.OK,
							errors: [],
						},
					],
				});

				const tranasactionInstance = library.logic.initTransaction.fromJson(
					transaction
				);

				sinonSandbox
					.stub(processTransactionLogic, 'composeTransactionSteps')
					.returns(composedTransactionsCheck);

				__private.receiveTransaction(
					transaction,
					'This is a log message',
					() => {
						expect(composedTransactionsCheck).to.have.been.calledWith([
							tranasactionInstance,
						]);
						done();
					}
				);
			});

			it('should call callback with error if transaction is not allowed', done => {
				const errorMessage = 'Transaction type 0 is currently not allowed.';

				sinonSandbox
					.stub(initTransaction, 'fromJson')
					.returns({ ...transaction, matcher: () => false });
				library.logic = {
					initTransaction,
				};

				__private.receiveTransaction(
					transaction,
					'This is a log message',
					err => {
						expect(err[0]).to.be.instanceOf(Error);
						expect(err[0].message).to.equal(errorMessage);
						done();
					}
				);
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(done => {
					library.logic = {
						initTransaction,
					};
					__private.receiveTransaction(
						transaction,
						'This is a log message',
						async () => {
							done();
						}
					);
				});

				it('should call modules.transactions.processUnconfirmedTransaction with transaction and true as arguments', async () =>
					expect(
						modules.transactions.processUnconfirmedTransaction.calledWith(
							initTransaction.fromJson(transaction),
							true
						)
					).to.be.true);
			});

			describe('when transaction is invalid', () => {
				let invalidTransaction;
				let errorResult;

				beforeEach(done => {
					invalidTransaction = {
						...transaction,
						amount: '0',
					};
					__private.receiveTransaction(
						invalidTransaction,
						'This is a log message',
						err => {
							errorResult = err;
							done();
						}
					);
				});

				it('should call the call back with error message', async () => {
					initTransaction.fromJson(invalidTransaction).validate();
					expect(errorResult).to.be.an('array');
					errorResult.forEach(anError => {
						expect(anError).to.be.instanceOf(TransactionError);
					});
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction fails', () => {
				let processUnconfirmedTransactionError;

				beforeEach(done => {
					processUnconfirmedTransactionError = `Transaction is already processed: ${
						transaction.id
					}`;
					modules.transactions.processUnconfirmedTransaction = sinonSandbox
						.stub()
						.callsArgWith(2, processUnconfirmedTransactionError);

					__private.receiveTransaction(
						transaction,
						'This is a log message',
						err => {
							error = err;
							done();
						}
					);
				});

				it('should call library.logger.debug with "Transaction ${transaction.id}" and error string', async () =>
					expect(
						library.logger.debug.calledWith(
							`Transaction ${transaction.id}`,
							processUnconfirmedTransactionError
						)
					).to.be.true);

				describe('when transaction is defined', () => {
					it('should call library.logger.debug with "Transaction" and transaction as arguments', async () =>
						expect(
							library.logger.debug.calledWith(
								'Transaction',
								initTransaction.fromJson(transaction)
							)
						).to.be.true);
				});

				it('should call callback with err.toString()', async () =>
					expect(error).to.equal(processUnconfirmedTransactionError));
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', () => {
				let result;

				beforeEach(done => {
					__private.receiveTransaction(
						transaction,
						'This is a log message',
						(err, res) => {
							error = err;
							result = res;
							done();
						}
					);
				});

				it('should call callback with error = null', async () =>
					expect(error).to.equal(null));

				it('should call callback with result = transaction.id', async () =>
					expect(result).to.equal(transaction.id));

				it('should call library.logger.debug with "Received transaction " + transaction.id', async () =>
					expect(
						library.logger.debug.calledWith(
							`Received transaction ${transaction.id}`
						)
					).to.be.true);
			});
		});

		describe('Transport', () => {
			let restoreRewiredTransportDeps;

			beforeEach(done => {
				blocksList = [];
				for (let j = 0; j < 10; j++) {
					const auxBlock = new Block();
					blocksList.push(auxBlock);
				}

				transportInstance = new TransportModule(() => {
					library = {
						schema: {
							validate: sinonSandbox.stub().callsArg(2),
						},
						logger: {
							debug: sinonSandbox.spy(),
						},
						config: {
							forging: {
								force: false,
							},
							broadcasts: {
								active: true,
							},
							httpPort: 8000,
						},
						channel: {
							invokeSync: sinonSandbox.stub(),
							publish: sinonSandbox.stub(),
						},
						initTransaction,
						block: {
							objectNormalize: sinonSandbox.stub().returns(new Block()),
						},
						logic: {
							block: {
								objectNormalize: sinonSandbox.stub().returns(new Block()),
							},
						},
						storage: {
							entities: {
								Block: {
									get: sinonSandbox.stub().resolves(blocksList),
								},
							},
						},
					};

					modules = {
						peers: {
							calculateConsensus: sinonSandbox.stub().returns(100),
						},
						loader: {
							syncing: sinonSandbox.stub().returns(false),
						},
						blocks: {
							utils: {
								loadBlocksData: sinonSandbox
									.stub()
									.callsArgWith(1, null, blocksList),
								loadBlocksDataWS: sinonSandbox
									.stub()
									.callsArgWith(1, null, blocksList),
							},
							verify: {
								addBlockProperties: sinonSandbox.stub().returns(blockMock),
							},
						},
						transactions: {
							getMultisignatureTransactionList: sinonSandbox
								.stub()
								.returns(transactionsList),
							getMergedTransactionList: sinonSandbox
								.stub()
								.returns(transactionsList),
						},
					};

					__private = {
						broadcaster: {},
						checkInternalAccess: sinonSandbox.stub().callsArg(1),
					};

					restoreRewiredTransportDeps = TransportModule.__set__({
						library,
						modules,
						__private,
					});

					done();
				}, defaultScope);
			});

			afterEach(done => {
				restoreRewiredTransportDeps();
				done();
			});

			describe('onBind', () => {
				beforeEach(done => {
					// Create a new TransportModule instance.
					// We want to check that internal variables are being set correctly so we don't
					// want any stubs to interfere here (e.g. from the top-level beforeEach block).
					new TransportModule((err, transportSelf) => {
						__private.broadcaster.bind = sinonSandbox.spy();
						transportSelf.onBind(defaultScope);
						done();
					}, defaultScope);
				});

				describe('modules', () => {
					let modulesObject;

					beforeEach(done => {
						modulesObject = TransportModule.__get__('modules');
						done();
					});

					it('should assign blocks, dapps, loader, multisignatures, peers and transactions properties', async () => {
						expect(modulesObject).to.have.property('blocks');
						expect(modulesObject).to.have.property('dapps');
						expect(modulesObject).to.have.property('loader');
						expect(modulesObject).to.have.property('multisignatures');
						expect(modulesObject).to.have.property('peers');
						return expect(modulesObject).to.have.property('transactions');
					});
				});

				describe('definitions', () => {
					let definitionsObject;

					beforeEach(done => {
						definitionsObject = TransportModule.__get__('definitions');
						done();
					});

					it('should assign definitions object', async () =>
						expect(definitionsObject).to.equal(definitions));
				});
			});

			describe('onSignature', () => {
				describe('when broadcast is defined', () => {
					beforeEach(done => {
						__private.broadcaster = {
							maxRelays: sinonSandbox.stub().returns(false),
							enqueue: sinonSandbox.stub(),
						};
						transportInstance.onSignature(SAMPLE_SIGNATURE_1, true);
						done();
					});

					it('should call __private.broadcaster.maxRelays with signature', async () => {
						expect(__private.broadcaster.maxRelays.calledOnce).to.be.true;
						return expect(
							__private.broadcaster.maxRelays.calledWith(SAMPLE_SIGNATURE_1)
						).to.be.true;
					});

					describe('when result of __private.broadcaster.maxRelays is false', () => {
						it('should call __private.broadcaster.enqueue with {} and {api: "postSignatures", data: {signature: signature}} as arguments', async () => {
							expect(__private.broadcaster.enqueue.calledOnce).to.be.true;
							return expect(
								__private.broadcaster.enqueue.calledWith(
									{},
									{
										api: 'postSignatures',
										data: { signature: SAMPLE_SIGNATURE_1 },
									}
								)
							).to.be.true;
						});

						it('should call library.channel.publish with "chain:signature:change" and signature', async () => {
							expect(library.channel.publish).to.be.calledOnce;
							expect(library.channel.publish).to.be.calledWith(
								'chain:signature:change',
								SAMPLE_SIGNATURE_1
							);
						});
					});
				});
			});

			describe('onUnconfirmedTransaction', () => {
				beforeEach(done => {
					transaction = new TransferTransaction({
						id: '222675625422353767',
						type: 0,
						amount: '100',
						fee: '10',
						senderPublicKey:
							'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
						recipientId: '12668885769632475474L',
						timestamp: 28227090,
						asset: {},
						signature:
							'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
					});
					__private.broadcaster = {
						maxRelays: sinonSandbox.stub().returns(true),
						enqueue: sinonSandbox.stub(),
					};
					transportInstance.onUnconfirmedTransaction(transaction, true);
					done();
				});

				describe('when broadcast is defined', () => {
					it('should call __private.broadcaster.maxRelays with transaction', async () => {
						expect(__private.broadcaster.maxRelays.calledOnce).to.be.true;
						return expect(__private.broadcaster.maxRelays).to.be.calledWith(
							transaction
						);
					});

					describe('when result of __private.broadcaster.maxRelays is false', () => {
						beforeEach(done => {
							__private.broadcaster = {
								maxRelays: sinonSandbox.stub().returns(false),
								enqueue: sinonSandbox.stub(),
							};
							library.channel.invokeSync
								.withArgs('lisk:getApplicationState')
								.returns({
									broadhash:
										'81a410c4ff35e6d643d30e42a27a222dbbfc66f1e62c32e6a91dd3438defb70b',
								});
							transportInstance.onUnconfirmedTransaction(transaction, true);
							done();
						});

						it('should call __private.broadcaster.enqueue with {} and {api: "postTransactions", data: {transaction}}', async () => {
							expect(__private.broadcaster.enqueue.calledOnce).to.be.true;
							return expect(
								__private.broadcaster.enqueue.calledWith(
									{},
									{
										api: 'postTransactions',
										data: { transaction: transaction.toJSON() },
									}
								)
							).to.be.true;
						});

						it('should call library.channel.publish with "chain:transactions:change" and transaction as arguments', async () => {
							expect(library.channel.publish).to.be.calledOnce;
							expect(library.channel.publish).to.be.calledWith(
								'chain:transactions:change',
								transaction.toJSON()
							);
						});
					});
				});
			});

			describe('onBroadcastBlock', () => {
				describe('when broadcast is defined', () => {
					beforeEach(async () => {
						block = {
							id: '6258354802676165798',
							height: 123,
							timestamp: 28227090,
							generatorPublicKey:
								'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
							numberOfTransactions: 15,
							totalAmount: new Bignum('150000000'),
							totalFee: new Bignum('15000000'),
							reward: new Bignum('50000000'),
							totalForged: '65000000',
						};
						__private.broadcaster = {
							maxRelays: sinonSandbox.stub().returns(false),
							enqueue: sinonSandbox.stub(),
							broadcast: sinonSandbox.stub(),
						};
						library.applicationState = {
							broadhash:
								'81a410c4ff35e6d643d30e42a27a222dbbfc66f1e62c32e6a91dd3438defb70b',
						};
						return transportInstance.onBroadcastBlock(block, true);
					});

					it('should call __private.broadcaster.maxRelays with block', async () => {
						expect(__private.broadcaster.maxRelays.calledOnce).to.be.true;
						return expect(__private.broadcaster.maxRelays.calledWith(block)).to
							.be.true;
					});

					it('should call __private.broadcaster.broadcast', async () => {
						expect(__private.broadcaster.broadcast.calledOnce).to.be.true;
						expect(__private.broadcaster.broadcast).to.be.calledWith(
							{
								broadhash:
									'81a410c4ff35e6d643d30e42a27a222dbbfc66f1e62c32e6a91dd3438defb70b',
							},
							{
								api: 'postBlock',
								data: {
									block,
								},
							}
						);
					});

					describe('when __private.broadcaster.maxRelays returns true', () => {
						beforeEach(done => {
							__private.broadcaster.maxRelays = sinonSandbox
								.stub()
								.returns(true);
							transportInstance.onBroadcastBlock(block, true);
							done();
						});

						it('should call library.logger.debug with proper error message', async () =>
							expect(
								library.logger.debug.calledWith(
									'Transport->onBroadcastBlock: Aborted - max block relays exhausted'
								)
							).to.be.true);
					});

					describe('when modules.loader.syncing = true', () => {
						beforeEach(done => {
							modules.loader.syncing = sinonSandbox.stub().returns(true);
							transportInstance.onBroadcastBlock(block, true);
							done();
						});

						it('should call library.logger.debug with proper error message', async () =>
							expect(
								library.logger.debug.calledWith(
									'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress'
								)
							).to.be.true);
					});
				});
			});

			describe('Transport.prototype.shared', () => {
				let result;
				let query;

				describe('blocksCommon', () => {
					let validateErr;

					describe('when query is undefined', () => {
						beforeEach(done => {
							query = undefined;
							validateErr = new Error('Query did not match schema');
							validateErr.code = 'INVALID_FORMAT';

							library.schema.validate = sinonSandbox
								.stub()
								.callsArgWith(2, [validateErr]);

							transportInstance.shared.blocksCommon(query, err => {
								error = err;
								done();
							});
						});

						it('should send back error due to schema validation failure', async () =>
							expect(error).to.equal(`${validateErr.message}: undefined`));
					});

					describe('when query is specified', () => {
						beforeEach(done => {
							query = { ids: '"1","2","3"' };
							transportInstance.shared.blocksCommon(query, err => {
								error = err;
								done();
							});
						});

						it('should call library.schema.validate with query and schema.commonBlock', async () => {
							expect(library.schema.validate.calledOnce).to.be.true;
							return expect(
								library.schema.validate.calledWith(
									query,
									definitions.WSBlocksCommonRequest
								)
							).to.be.true;
						});

						describe('when library.schema.validate fails', () => {
							beforeEach(done => {
								validateErr = new Error('Query did not match schema');
								validateErr.code = 'INVALID_FORMAT';

								library.schema.validate = sinonSandbox
									.stub()
									.callsArgWith(2, [validateErr]);

								transportInstance.shared.blocksCommon(query, err => {
									error = err;
									done();
								});
							});

							it('should call library.logger.debug with "Common block request validation failed" and {err: err.toString(), req: query}', async () => {
								expect(library.logger.debug.calledOnce).to.be.true;
								return expect(
									library.logger.debug.calledWith(
										'Common block request validation failed',
										{ err: `${validateErr.message}: undefined`, req: query }
									)
								).to.be.true;
							});

							it('should call callback with error', async () =>
								expect(error).to.equal(`${validateErr.message}: undefined`));
						});

						describe('when library.schema.validate succeeds', () => {
							describe('when escapedIds.length = 0', () => {
								beforeEach(done => {
									// All ids will be filtered out because they are non-numeric.
									query = { ids: '"abc","def","ghi"' };
									transportInstance.shared.blocksCommon(query, err => {
										error = err;
										done();
									});
								});

								it('should call library.logger.debug with "Common block request validation failed" and {err: "ESCAPE", req: query.ids}', async () => {
									expect(library.logger.debug.calledOnce).to.be.true;
									return expect(
										library.logger.debug.calledWith(
											'Common block request validation failed',
											{ err: 'ESCAPE', req: query.ids }
										)
									).to.be.true;
								});

								it('should call callback with error = "Invalid block id sequence"', async () =>
									expect(error).to.be.equal('Invalid block id sequence'));
							});
						});
					});
				});

				describe('blocks', () => {
					describe('when query is undefined', () => {
						beforeEach(done => {
							query = undefined;

							modules.blocks.utils.loadBlocksData = sinonSandbox
								.stub()
								.callsArgWith(1, null, []);

							transportInstance.shared.blocks(query, (err, res) => {
								error = err;
								result = res;
								done();
							});
						});

						it('should send back empty blocks', async () => {
							expect(error).to.equal(null);
							return expect(result).to.eql({
								success: false,
								message: 'Invalid lastBlockId requested',
							});
						});
					});

					describe('when query is defined', () => {
						beforeEach(done => {
							query = {
								lastBlockId: '6258354802676165798',
							};

							transportInstance.shared.blocks(query, (err, res) => {
								error = err;
								result = res;
								done();
							});
						});

						it('should call modules.blocks.utils.loadBlocksData with { limit: 34, lastId: query.lastBlockId }', async () =>
							expect(modules.blocks.utils.loadBlocksDataWS).to.be.calledWith({
								limit: 34,
								lastId: query.lastBlockId,
							}));

						describe('when modules.blocks.utils.loadBlocksData fails', () => {
							let loadBlockFailed;

							beforeEach(done => {
								loadBlockFailed = new Error('Failed to load blocks...');
								modules.blocks.utils.loadBlocksDataWS = sinonSandbox
									.stub()
									.callsArgWith(1, loadBlockFailed);

								transportInstance.shared.blocks(query, (err, res) => {
									error = err;
									result = res;
									done();
								});
							});

							it('should call callback with error = null', async () =>
								expect(error).to.be.equal(null));

							it('should call callback with result = { blocks: [] }', async () =>
								expect(result)
									.to.have.property('blocks')
									.which.is.an('array').that.is.empty);
						});
					});
				});

				describe('postBlock', () => {
					let postBlockQuery;

					beforeEach(done => {
						postBlockQuery = {
							block: blockMock,
						};
						library.bus = {
							message: sinonSandbox.stub(),
						};
						library.logic.initTransaction = initTransaction;
						done();
					});

					describe('when library.config.broadcasts.active option is false', () => {
						beforeEach(done => {
							library.config.broadcasts.active = false;
							transportInstance.shared.postBlock(postBlockQuery);
							done();
						});

						it('should call library.logger.debug', async () =>
							expect(
								library.logger.debug.calledWith(
									'Receiving blocks disabled by user through config.json'
								)
							).to.be.true);

						it('should not call library.schema.validate; function should return before', async () =>
							expect(library.schema.validate.called).to.be.false);
					});

					describe('when query is specified', () => {
						beforeEach(done => {
							transportInstance.shared.postBlock(postBlockQuery);
							done();
						});

						describe('when it throws', () => {
							const blockValidationError = 'Failed to validate block schema';

							beforeEach(done => {
								library.logic.block.objectNormalize = sinonSandbox
									.stub()
									.throws(blockValidationError);
								transportInstance.shared.postBlock(postBlockQuery);
								done();
							});

							it('should call library.logger.debug with "Block normalization failed" and {err: error, module: "transport", block: query.block }', async () =>
								expect(
									library.logger.debug.calledWith(
										'Block normalization failed',
										{
											err: blockValidationError.toString(),
											module: 'transport',
											block: blockMock,
										}
									)
								).to.be.true);
						});

						describe('when it does not throw', () => {
							beforeEach(done => {
								library.logic.block.objectNormalize = sinonSandbox
									.stub()
									.returns(blockMock);
								transportInstance.shared.postBlock(postBlockQuery);
								done();
							});

							describe('when query.block is defined', () => {
								it('should call modules.blocks.verify.addBlockProperties with query.block', async () =>
									expect(
										modules.blocks.verify.addBlockProperties.calledWith(
											postBlockQuery.block
										)
									).to.be.true);
							});

							it('should call library.logic.block.objectNormalize with block', async () =>
								expect(
									library.logic.block.objectNormalize.calledWith(blockMock)
								).to.be.true);

							it('should call library.bus.message with "receiveBlock" and block', async () =>
								expect(
									library.bus.message.calledWith('receiveBlock', blockMock)
								).to.be.true);
						});
					});
				});

				describe('postSignature', () => {
					beforeEach(done => {
						query = {
							signature: SAMPLE_SIGNATURE_1,
						};
						__private.receiveSignature = sinonSandbox.stub().callsArg(1);
						transportInstance.shared.postSignature(query, (err, res) => {
							error = err;
							result = res;
							done();
						});
					});

					it('should call __private.receiveSignature with query.signature as argument', async () =>
						expect(__private.receiveSignature.calledWith(query.signature)).to.be
							.true);

					describe('when __private.receiveSignature succeeds', () => {
						it('should invoke callback with object { success: true }', async () => {
							expect(error).to.equal(null);
							return expect(result)
								.to.have.property('success')
								.which.is.equal(true);
						});
					});

					describe('when __private.receiveSignature fails', () => {
						const receiveSignatureError = 'Invalid signature body ...';

						beforeEach(done => {
							query = {
								signature: SAMPLE_SIGNATURE_1,
							};
							__private.receiveSignature = sinonSandbox
								.stub()
								.callsArgWith(1, receiveSignatureError);
							transportInstance.shared.postSignature(query, (err, res) => {
								error = err;
								result = res;
								done();
							});
						});

						it('should invoke callback with object { success: false, message: err }', async () => {
							expect(error).to.equal(null);
							expect(result)
								.to.have.property('success')
								.which.is.equal(false);
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveSignatureError);
						});
					});
				});

				describe('postSignatures', () => {
					beforeEach(done => {
						query = {
							signatures: [SAMPLE_SIGNATURE_1],
						};
						__private.receiveSignatures = sinonSandbox.stub();
						done();
					});

					describe('when library.config.broadcasts.active option is false', () => {
						beforeEach(done => {
							library.config.broadcasts.active = false;
							library.schema.validate = sinonSandbox.stub().callsArg(2);
							transportInstance.shared.postSignatures(query);
							done();
						});

						it('should call library.logger.debug', async () =>
							expect(
								library.logger.debug.calledWith(
									'Receiving signatures disabled by user through config.json'
								)
							).to.be.true);

						it('should not call library.schema.validate; function should return before', async () =>
							expect(library.schema.validate.called).to.be.false);
					});

					describe('when library.schema.validate succeeds', () => {
						beforeEach(done => {
							transportInstance.shared.postSignatures(query);
							done();
						});

						it('should call __private.receiveSignatures with query.signatures as argument', async () =>
							expect(__private.receiveSignatures.calledWith(query.signatures))
								.to.be.true);
					});
					describe('when library.schema.validate fails', () => {
						let validateErr;

						beforeEach(done => {
							validateErr = new Error('Transaction query did not match schema');
							validateErr.code = 'INVALID_FORMAT';

							library.schema.validate = sinonSandbox
								.stub()
								.callsArgWith(2, validateErr);
							transportInstance.shared.postSignatures(query);
							done();
						});

						it('should call library.logger.debug with "Invalid signatures body" and err as arguments', async () =>
							expect(
								library.logger.debug.calledWith(
									'Invalid signatures body',
									validateErr
								)
							).to.be.true);
					});
				});

				describe('getSignatures', () => {
					beforeEach(done => {
						modules.transactions.getMultisignatureTransactionList = sinonSandbox
							.stub()
							.returns(multisignatureTransactionsList);
						transportInstance.shared.getSignatures((err, res) => {
							error = err;
							result = res;
							done();
						});
					});

					it('should call modules.transactions.getMultisignatureTransactionList with true and MAX_SHARED_TRANSACTIONS', async () =>
						expect(
							modules.transactions.getMultisignatureTransactionList.calledWith(
								true,
								MAX_SHARED_TRANSACTIONS
							)
						).to.be.true);

					describe('when all transactions returned by modules.transactions.getMultisignatureTransactionList are multisignature transactions', () => {
						it('should call callback with error = null', async () =>
							expect(error).to.equal(null));

						it('should call callback with result = {success: true, signatures: signatures} where signatures contains all transactions', async () => {
							expect(result)
								.to.have.property('success')
								.which.equals(true);
							return expect(result)
								.to.have.property('signatures')
								.which.is.an('array')
								.that.has.property('length')
								.which.equals(2);
						});
					});

					describe('when some transactions returned by modules.transactions.getMultisignatureTransactionList are multisignature registration transactions', () => {
						beforeEach(done => {
							// Make it so that the first transaction in the list is a multisignature registration transaction.
							multisignatureTransactionsList[0] = {
								id: '222675625422353767',
								type: 4,
								amount: '150000000',
								fee: '1000000',
								senderPublicKey:
									'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
								recipientId: '12668885769632475474L',
								timestamp: 28227090,
								asset: {},
								signature:
									'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
							};

							modules.transactions.getMultisignatureTransactionList = sinonSandbox
								.stub()
								.returns(multisignatureTransactionsList);
							transportInstance.shared.getSignatures((err, res) => {
								error = err;
								result = res;
								done();
							});
						});

						it('should call callback with error = null', async () =>
							expect(error).to.equal(null));

						it('should call callback with result = {success: true, signatures: signatures} where signatures does not contain multisignature registration transactions', async () => {
							expect(result)
								.to.have.property('success')
								.which.equals(true);
							return expect(result)
								.to.have.property('signatures')
								.which.is.an('array')
								.that.has.property('length')
								.which.equals(1);
						});
					});
				});

				describe('getTransactions', () => {
					beforeEach(done => {
						transportInstance.shared.getTransactions((err, res) => {
							error = err;
							result = res;
							done();
						});
					});

					it('should call modules.transactions.getMergedTransactionList with true and MAX_SHARED_TRANSACTIONS', async () =>
						expect(
							modules.transactions.getMergedTransactionList.calledWith(
								true,
								MAX_SHARED_TRANSACTIONS
							)
						).to.be.true);

					it('should call callback with error = null', async () =>
						expect(error).to.equal(null));

					it('should call callback with result = {success: true, transactions: transactions}', async () => {
						expect(result)
							.to.have.property('success')
							.which.is.equal(true);
						return expect(result)
							.to.have.property('transactions')
							.which.is.an('array')
							.that.has.property('length')
							.which.equals(2);
					});
				});

				describe('postTransaction', () => {
					beforeEach(done => {
						query = {
							transaction,
							extraLogMessage: 'This is a log message',
						};
						__private.receiveTransaction = sinonSandbox
							.stub()
							.callsArgWith(2, null, transaction.id);
						transportInstance.shared.postTransaction(query, (err, res) => {
							error = err;
							result = res;
							done();
						});
					});

					it('should call __private.receiveTransaction with query.transaction, query.peer and query.extraLogMessage as arguments', async () =>
						expect(
							__private.receiveTransaction.calledWith(
								query.transaction,
								query.extraLogMessage
							)
						).to.be.true);

					describe('when __private.receiveTransaction succeeds', () => {
						it('should invoke callback with object { success: true, transactionId: id }', async () => {
							expect(error).to.equal(null);
							expect(result)
								.to.have.property('transactionId')
								.which.is.a('string');
							return expect(result)
								.to.have.property('success')
								.which.is.equal(true);
						});
					});

					describe('when __private.receiveTransaction fails', () => {
						const receiveTransactionError = 'Invalid transaction body ...';

						beforeEach(done => {
							__private.receiveTransaction = sinonSandbox
								.stub()
								.callsArgWith(2, receiveTransactionError);
							transportInstance.shared.postTransaction(query, (err, res) => {
								error = err;
								result = res;
								done();
							});
						});

						it('should invoke callback with object { success: false, message: err }', async () => {
							expect(error).to.equal(null);
							expect(result)
								.to.have.property('success')
								.which.is.equal(false);
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveTransactionError);
						});
					});

					describe('when __private.receiveTransaction fails with "Transaction pool is full"', () => {
						const receiveTransactionError = 'Transaction pool is full';

						beforeEach(done => {
							__private.receiveTransaction = sinonSandbox
								.stub()
								.callsArgWith(2, receiveTransactionError);
							transportInstance.shared.postTransaction(query, (err, res) => {
								error = err;
								result = res;
								done();
							});
						});

						it('should invoke callback with object { success: false, message: err }', async () => {
							expect(error).to.equal(null);
							expect(result)
								.to.have.property('success')
								.which.is.equal(false);
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveTransactionError);
						});
					});
				});

				describe('postTransactions', () => {
					describe('when library.config.broadcasts.active option is false', () => {
						beforeEach(done => {
							library.config.broadcasts.active = false;
							library.schema.validate = sinonSandbox.stub().callsArg(2);
							transportInstance.shared.postTransactions(query);
							done();
						});

						it('should call library.logger.debug', async () =>
							expect(
								library.logger.debug.calledWith(
									'Receiving transactions disabled by user through config.json'
								)
							).to.be.true);

						it('should not call library.schema.validate; function should return before', async () =>
							expect(library.schema.validate.called).to.be.false);
					});

					describe('when library.schema.validate succeeds', () => {
						beforeEach(done => {
							query = {
								transactions: transactionsList,
								extraLogMessage: 'This is a log message',
							};
							__private.receiveTransactions = sinonSandbox.stub();
							transportInstance.shared.postTransactions(query);
							done();
						});

						it('should call __private.receiveTransactions with query.transaction and query.extraLogMessage as arguments', async () =>
							expect(
								__private.receiveTransactions.calledWith(
									query.transactions,
									query.extraLogMessage
								)
							).to.be.true);
					});

					describe('when library.schema.validate fails', () => {
						let validateErr;

						beforeEach(done => {
							validateErr = new Error('Transaction query did not match schema');
							validateErr.code = 'INVALID_FORMAT';

							library.schema.validate = sinonSandbox
								.stub()
								.callsArgWith(2, [validateErr]);
							transportInstance.shared.postTransactions(query);
							done();
						});

						it('should invoke callback with error = null and result = {success: false, message: message}', async () => {
							expect(error).to.equal(null);
							expect(result)
								.to.have.property('success')
								.which.equals(false);
							return expect(result)
								.to.have.property('message')
								.which.is.a('string');
						});
					});
				});
			});
		});
	});
});
