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
const BigNum = require('@liskhq/bignum');
const { transfer, TransactionError } = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const Block = require('../../../fixtures/blocks').Block;
const {
	registeredTransactions,
} = require('../../../common/registered_transactions');
const transactionsModule = require('../../../../../src/modules/chain/transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../src/modules/chain/interface_adapters');
const blocksModule = require('../../../../../src/modules/chain/blocks');

const TransportModule = rewire('../../../../../src/modules/chain/transport');

const { MAX_SHARED_TRANSACTIONS } = __testContext.config.constants;
const expect = chai.expect;

describe('transport', () => {
	const interfaceAdapters = {
		transactions: new TransactionInterfaceAdapter(registeredTransactions),
	};

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
		schemaStub = {
			validate: sinonSandbox.stub().returns(true),
			getLastErrors: sinonSandbox.stub().returns([]),
		};
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
			},
			components: {
				storage: storageStub,
				logger: loggerStub,
			},
			block: blockStub,
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
				transactionPool: {
					getMultisignatureTransactionList: sinonSandbox.stub(),
					getMergedTransactionList: sinonSandbox.stub(),
					getTransactionAndProcessSignature: sinonSandbox.stub(),
					processUnconfirmedTransaction: sinonSandbox.stub(),
				},
				interfaceAdapters: {
					transactions: {
						fromBlock: sinonSandbox.stub(),
						fromJson: sinonSandbox.stub(),
						dbRead: sinonSandbox.stub(),
					},
				},
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

	afterEach(async () => {
		restoreRewiredTopDeps();
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		describe('library', () => {
			beforeEach(async () => {
				new TransportModule(defaultScope);
				library = TransportModule.__get__('library');
				__private = TransportModule.__get__('__private');
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
					.to.have.nested.property('block')
					.which.is.equal(blockStub);

				expect(__private)
					.to.have.property('broadcaster')
					.which.is.equal(broadcasterStubRef);
			});
		});
	});

	describe('__private', () => {
		let __privateOriginal;
		let restoreRewiredDeps;

		beforeEach(async () => {
			__privateOriginal = {};

			new TransportModule(defaultScope);
			// Backup the __private variable so that properties can be overridden
			// by individual test cases and then we will restore them after each test case has run.
			// This is neccessary because different test cases may want to stub out different parts of the
			// __private modules while testing other parts.
			__private = TransportModule.__get__('__private');

			Object.keys(__private).forEach(field => {
				__privateOriginal[field] = __private[field];
			});

			library = {
				schema: schemaStub,
				logger: {
					debug: sinonSandbox.spy(),
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
				blocks: {
					lastBlock: {
						get: sinonSandbox
							.stub()
							.returns({ height: 1, version: 1, timestamp: 1 }),
					},
				},
				interfaceAdapters,
				transactionPool: defaultScope.modules.transactionPool,
			};

			restoreRewiredDeps = TransportModule.__set__({
				library,
				modules,
				definitions,
			});
		});

		afterEach(async () => {
			Object.keys(__private).forEach(field => {
				delete __private[field];
			});
			Object.keys(__privateOriginal).forEach(field => {
				__private[field] = __privateOriginal[field];
			});
			restoreRewiredDeps();
		});

		describe('receiveSignatures', () => {
			describe('for every signature in signatures', () => {
				describe('when __private.receiveSignature succeeds', () => {
					beforeEach(async () => {
						__private.receiveSignature = sinonSandbox.stub().callsArg(1);
						__private.receiveSignatures([
							SAMPLE_SIGNATURE_1,
							SAMPLE_SIGNATURE_2,
						]);
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

					beforeEach(async () => {
						receiveSignatureError = new Error(
							'Error processing signature: Error message'
						);
						__private.receiveSignature = sinonSandbox
							.stub()
							.rejects(receiveSignatureError);

						await __private.receiveSignatures([
							SAMPLE_SIGNATURE_1,
							SAMPLE_SIGNATURE_2,
						]);
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
			beforeEach(async () => {
				modules.multisignatures = {
					getTransactionAndProcessSignature: sinonSandbox.stub().callsArg(1),
				};
			});

			describe('when library.schema.validate succeeds', () => {
				describe('when modules.transactionPool.getTransactionAndProcessSignature succeeds', () => {
					beforeEach(async () => {
						modules.transactionPool.getTransactionAndProcessSignature.resolves();
						return __private.receiveSignature(SAMPLE_SIGNATURE_1);
					});

					it('should call library.schema.validate with signature', async () => {
						expect(library.schema.validate.calledOnce).to.be.true;
						return expect(
							library.schema.validate.calledWith(SAMPLE_SIGNATURE_1)
						).to.be.true;
					});

					it('should call modules.transactionPool.getTransactionAndProcessSignature with signature', async () => {
						return expect(
							modules.transactionPool.getTransactionAndProcessSignature
						).to.be.calledWith(SAMPLE_SIGNATURE_1);
					});
				});

				describe('when modules.transactionPool.getTransactionAndProcessSignature fails', () => {
					const processSignatureError = new TransactionError(
						'Transaction not found'
					);

					it('should reject with error', async () => {
						modules.transactionPool.getTransactionAndProcessSignature.rejects([
							processSignatureError,
						]);

						return expect(
							__private.receiveSignature(SAMPLE_SIGNATURE_1)
						).to.be.rejectedWith([processSignatureError]);
					});
				});
			});

			describe('when library.schema.validate fails', () => {
				it('should reject with error = "Invalid signature body"', async () => {
					const validateErr = new Error('Signature did not match schema');
					validateErr.code = 'INVALID_FORMAT';
					library.schema.validate = sinonSandbox.stub().returns(false);
					library.schema.getLastErrors = sinonSandbox
						.stub()
						.returns(validateErr);

					return expect(
						__private.receiveSignature(SAMPLE_SIGNATURE_1)
					).to.be.rejectedWith(validateErr);
				});
			});
		});

		describe('receiveTransactions', () => {
			beforeEach(async () => {
				library.logger = {
					debug: sinonSandbox.spy(),
				};

				__private.receiveTransaction = sinonSandbox.stub().callsArg(1);
			});

			describe('when transactions argument is undefined', () => {
				beforeEach(async () => {
					__private.receiveTransactions(undefined);
				});

				// If a single transaction within the batch fails, it is not going to
				// send back an error.
				it('should should not call __private.receiveTransaction', async () =>
					expect(__private.receiveTransaction.notCalled).to.be.true);
			});

			describe('for every transaction in transactions', () => {
				describe('when transaction is defined', () => {
					describe('when call __private.receiveTransaction succeeds', () => {
						beforeEach(async () => {
							__private.receiveTransactions(transactionsList);
						});

						it('should set transaction.bundled = true', async () =>
							expect(transactionsList[0])
								.to.have.property('bundled')
								.which.equals(true));

						it('should call __private.receiveTransaction with transaction with transaction argument', async () =>
							expect(
								__private.receiveTransaction.calledWith(transactionsList[0])
							).to.be.true);
					});

					describe('when call __private.receiveTransaction fails', () => {
						let receiveTransactionError;

						beforeEach(async () => {
							receiveTransactionError = 'Invalid transaction body - ...';
							__private.receiveTransaction = sinonSandbox
								.stub()
								.rejects(receiveTransactionError);

							return __private.receiveTransactions(transactionsList);
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
			beforeEach(async () => {
				sinonSandbox
					.stub(balancesSequenceStub, 'add')
					.callsFake((callback, doneCallback) => {
						callback(doneCallback);
					});

				library.logger = {
					debug: sinonSandbox.spy(),
				};
				library.balancesSequence = balancesSequenceStub;

				modules.transactionPool.processUnconfirmedTransaction.resolves();
			});

			afterEach(() => sinonSandbox.restore());

			it('should composeProcessTransactionsSteps with checkAllowedTransactions and validateTransactions', async () => {
				sinonSandbox.spy(transactionsModule, 'composeTransactionSteps');
				await __private.receiveTransaction(transaction);
				return expect(transactionsModule.composeTransactionSteps).to.be
					.calledOnce;
			});

			it('should call composedTransactionsCheck an array of transactions', async () => {
				const composedTransactionsCheck = sinonSandbox.stub().returns({
					transactionsResponses: [
						{
							id: transaction.id,
							status: TransactionStatus.OK,
							errors: [],
						},
					],
				});

				const tranasactionInstance = interfaceAdapters.transactions.fromJson(
					transaction
				);

				sinonSandbox
					.stub(transactionsModule, 'composeTransactionSteps')
					.returns(composedTransactionsCheck);

				await __private.receiveTransaction(transaction);
				return expect(composedTransactionsCheck).to.have.been.calledWith([
					tranasactionInstance,
				]);
			});

			it('should reject with error if transaction is not allowed', async () => {
				const errorMessage = new Error(
					'Transaction type 0 is currently not allowed.'
				);

				sinonSandbox
					.stub(interfaceAdapters.transactions, 'fromJson')
					.returns({ ...transaction, matcher: () => false });

				return expect(
					__private.receiveTransaction(transaction)
				).to.be.rejectedWith([errorMessage]);
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(async () => {
					await __private.receiveTransaction(transaction);
				});

				it('should call modules.transactionPool.processUnconfirmedTransaction with transaction and true as arguments', async () =>
					expect(
						modules.transactionPool.processUnconfirmedTransaction.calledWith(
							interfaceAdapters.transactions.fromJson(transaction),
							true
						)
					).to.be.true);
			});

			describe('when transaction is invalid', () => {
				let invalidTransaction;
				let errorResult;

				beforeEach(async () => {
					invalidTransaction = {
						...transaction,
						amount: '0',
					};

					try {
						await __private.receiveTransaction(invalidTransaction);
					} catch (err) {
						errorResult = err;
					}
				});

				it('should call the call back with error message', async () => {
					interfaceAdapters.transactions
						.fromJson(invalidTransaction)
						.validate();
					expect(errorResult).to.be.an('array');
					errorResult.forEach(anError => {
						expect(anError).to.be.instanceOf(TransactionError);
					});
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction fails', () => {
				let processUnconfirmedTransactionError;

				beforeEach(async () => {
					processUnconfirmedTransactionError = `Transaction is already processed: ${
						transaction.id
					}`;

					modules.transactionPool.processUnconfirmedTransaction.rejects([
						new Error(processUnconfirmedTransactionError),
					]);

					try {
						await __private.receiveTransaction(transaction);
					} catch (err) {
						error = err;
					}
				});

				it('should call library.logger.debug with "Transaction ${transaction.id}" and error string', async () => {
					expect(library.logger.debug).to.be.calledWith(
						`Transaction ${transaction.id}`,
						`Error: ${processUnconfirmedTransactionError}`
					);
				});

				describe('when transaction is defined', () => {
					it('should call library.logger.debug with "Transaction" and transaction as arguments', async () => {
						expect(library.logger.debug).to.be.calledWith(
							'Transaction',
							interfaceAdapters.transactions.fromJson(transaction)
						);
					});
				});

				it('should reject with error', async () => {
					expect(error).to.be.an('array');
					expect(error[0].message).to.equal(processUnconfirmedTransactionError);
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', () => {
				let result;

				beforeEach(async () => {
					result = await __private.receiveTransaction(transaction);
				});

				it('should resolve with result = transaction.id', async () =>
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

			beforeEach(async () => {
				blocksList = [];
				for (let j = 0; j < 10; j++) {
					const auxBlock = new Block();
					blocksList.push(auxBlock);
				}

				transportInstance = new TransportModule(defaultScope);
				library = {
					schema: schemaStub,
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
					interfaceAdapters: {
						transactions: {
							fromBlock: sinonSandbox.stub(),
						},
					},
					blocks: {
						loadBlocksDataWS: sinonSandbox.stub().resolves(blocksList),
						receiveBlockFromNetwork: sinonSandbox.stub().resolves(true),
					},
					transactionPool: {
						getMultisignatureTransactionList: sinonSandbox
							.stub()
							.returns(transactionsList),
						getMergedTransactionList: sinonSandbox
							.stub()
							.returns(transactionsList),
					},
				};
				sinonSandbox
					.stub(blocksModule, 'addBlockProperties')
					.returns(blockMock);

				__private = {
					broadcaster: {},
					checkInternalAccess: sinonSandbox.stub().callsArg(1),
				};

				restoreRewiredTransportDeps = TransportModule.__set__({
					library,
					modules,
					__private,
				});
			});

			afterEach(async () => {
				restoreRewiredTransportDeps();
			});

			describe('onBind', () => {
				beforeEach(async () => {
					// Create a new TransportModule instance.
					// We want to check that internal variables are being set correctly so we don't
					// want any stubs to interfere here (e.g. from the top-level beforeEach block).
					const transportSelf = new TransportModule(defaultScope);
					__private.broadcaster.bind = sinonSandbox.spy();
					transportSelf.onBind(defaultScope);
				});

				describe('modules', () => {
					let modulesObject;

					beforeEach(async () => {
						modulesObject = TransportModule.__get__('modules');
					});

					it('should assign blocks, loader, multisignatures, processTransactions and transactions properties', async () => {
						expect(modulesObject).to.have.property('blocks');
						expect(modulesObject).to.have.property('loader');
						expect(modulesObject).to.have.property('interfaceAdapters');
						return expect(modulesObject).to.have.property('transactionPool');
					});
				});

				describe('definitions', () => {
					let definitionsObject;

					beforeEach(async () => {
						definitionsObject = TransportModule.__get__('definitions');
					});

					it('should assign definitions object', async () =>
						expect(definitionsObject).to.equal(definitions));
				});
			});

			describe('onSignature', () => {
				describe('when broadcast is defined', () => {
					beforeEach(async () => {
						__private.broadcaster = {
							maxRelays: sinonSandbox.stub().returns(false),
							enqueue: sinonSandbox.stub(),
						};
						transportInstance.onSignature(SAMPLE_SIGNATURE_1, true);
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
				beforeEach(async () => {
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
				});

				describe('when broadcast is defined', () => {
					it('should call __private.broadcaster.maxRelays with transaction', async () => {
						expect(__private.broadcaster.maxRelays.calledOnce).to.be.true;
						return expect(__private.broadcaster.maxRelays).to.be.calledWith(
							transaction
						);
					});

					describe('when result of __private.broadcaster.maxRelays is false', () => {
						beforeEach(async () => {
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
							totalAmount: new BigNum('150000000'),
							totalFee: new BigNum('15000000'),
							reward: new BigNum('50000000'),
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
						beforeEach(async () => {
							__private.broadcaster.maxRelays = sinonSandbox
								.stub()
								.returns(true);
							transportInstance.onBroadcastBlock(block, true);
						});

						it('should call library.logger.debug with proper error message', async () =>
							expect(
								library.logger.debug.calledWith(
									'Transport->onBroadcastBlock: Aborted - max block relays exhausted'
								)
							).to.be.true);
					});

					describe('when modules.loader.syncing = true', () => {
						beforeEach(async () => {
							modules.loader.syncing = sinonSandbox.stub().returns(true);
							transportInstance.onBroadcastBlock(block, true);
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
						it('should send back error due to schema validation failure', () => {
							query = undefined;
							validateErr = new Error('Query did not match schema');
							validateErr.code = 'INVALID_FORMAT';
							library.schema.validate = sinonSandbox.stub().returns(false);
							library.schema.getLastErrors = sinonSandbox
								.stub()
								.returns([validateErr]);

							return expect(
								transportInstance.shared.blocksCommon(query)
							).to.be.rejectedWith('Query did not match schema: undefined');
						});
					});

					describe('when query is specified', () => {
						it('should call library.schema.validate with query and schema.commonBlock', async () => {
							query = { ids: '"1","2","3"' };

							await transportInstance.shared.blocksCommon(query);

							expect(library.schema.validate.calledOnce).to.be.true;
							return expect(
								library.schema.validate.calledWith(
									query,
									definitions.WSBlocksCommonRequest
								)
							).to.be.true;
						});

						describe('when library.schema.validate fails', () => {
							it('should call library.logger.debug with "Common block request validation failed" and {err: err.toString(), req: query}', async () => {
								validateErr = new Error('Query did not match schema');
								validateErr.code = 'INVALID_FORMAT';
								library.schema.validate = sinonSandbox.stub().returns(false);
								library.schema.getLastErrors = sinonSandbox
									.stub()
									.returns([validateErr]);

								expect(
									transportInstance.shared.blocksCommon(query)
								).to.be.rejectedWith('Query did not match schema');
								expect(library.logger.debug.calledOnce).to.be.true;
								return expect(
									library.logger.debug.calledWith(
										'Common block request validation failed',
										{ err: `${validateErr.message}: undefined`, req: query }
									)
								).to.be.true;
							});
						});

						describe('when library.schema.validate succeeds', () => {
							describe('when escapedIds.length = 0', () => {
								it('should call library.logger.debug with "Common block request validation failed" and {err: "ESCAPE", req: query.ids}', async () => {
									query = { ids: '"abc","def","ghi"' };
									library.schema.validate = sinonSandbox.stub().returns(true);

									expect(
										transportInstance.shared.blocksCommon(query)
									).to.be.rejectedWith('Invalid block id sequence');
									expect(library.logger.debug.calledOnce).to.be.true;
									return expect(
										library.logger.debug.calledWith(
											'Common block request validation failed',
											{ err: 'ESCAPE', req: query.ids }
										)
									).to.be.true;
								});
							});
						});
					});
				});

				describe('blocks', () => {
					describe('when query is undefined', () => {
						it('should send back empty blocks', async () => {
							query = undefined;
							modules.blocks.loadBlocksData = sinonSandbox
								.stub()
								.callsArgWith(1, null, []);

							const response = await transportInstance.shared.blocks(query);
							return expect(response).to.eql({
								success: false,
								message: 'Invalid lastBlockId requested',
							});
						});
					});

					describe('when query is defined', () => {
						it('should call modules.blocks.utils.loadBlocksData with { limit: 34, lastId: query.lastBlockId }', async () => {
							query = {
								lastBlockId: '6258354802676165798',
							};

							await transportInstance.shared.blocks(query);
							return expect(modules.blocks.loadBlocksDataWS).to.be.calledWith({
								limit: 34,
								lastId: query.lastBlockId,
							});
						});
					});

					describe('when modules.blocks.utils.loadBlocksData fails', () => {
						it('should resolve with result = { blocks: [] }', async () => {
							query = {
								lastBlockId: '6258354802676165798',
							};

							const loadBlockFailed = new Error('Failed to load blocks...');
							modules.blocks.loadBlocksDataWS.rejects(loadBlockFailed);

							const response = await transportInstance.shared.blocks(query);
							return expect(response)
								.to.have.property('blocks')
								.which.is.an('array').that.is.empty;
						});
					});
				});

				describe('postBlock', () => {
					let postBlockQuery;

					beforeEach(async () => {
						postBlockQuery = {
							block: blockMock,
						};
						library.bus = {
							message: sinonSandbox.stub(),
						};
					});

					describe('when library.config.broadcasts.active option is false', () => {
						beforeEach(async () => {
							library.config.broadcasts.active = false;
							transportInstance.shared.postBlock(postBlockQuery);
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
						beforeEach(async () => {
							transportInstance.shared.postBlock(postBlockQuery);
						});

						describe('when it throws', () => {
							const blockValidationError = 'Failed to validate block schema';

							beforeEach(async () => {
								sinonSandbox
									.stub(blocksModule, 'objectNormalize')
									.throws(blockValidationError);
								transportInstance.shared.postBlock(postBlockQuery);
							});

							it('should call library.logger.debug with "Block normalization failed" and {err: error, module: "transport", block: query.block }', async () => {
								expect(library.logger.debug).to.be.calledWith(
									'Block normalization failed',
									{
										err: blockValidationError.toString(),
										module: 'transport',
										block: blockMock,
									}
								);
							});
						});

						describe('when it does not throw', () => {
							beforeEach(async () => {
								sinonSandbox
									.stub(blocksModule, 'objectNormalize')
									.returns(blockMock);
								transportInstance.shared.postBlock(postBlockQuery);
							});

							describe('when query.block is defined', () => {
								it('should call modules.blocks.verify.addBlockProperties with query.block', async () =>
									expect(
										blocksModule.addBlockProperties.calledWith(
											postBlockQuery.block
										)
									).to.be.true);
							});

							it('should call library.block.objectNormalize with block', async () =>
								expect(blocksModule.objectNormalize.calledWith(blockMock)).to.be
									.true);

							it('should call block.process.receiveBlockFromNetwork with block', async () => {
								expect(
									modules.blocks.receiveBlockFromNetwork
								).to.be.calledWithExactly(blockMock);
							});
						});
					});
				});

				describe('postSignature', () => {
					describe('when getTransactionAndProcessSignature succeeds', () => {
						it('should invoke resolve with object { success: true }', async () => {
							query = {
								signature: SAMPLE_SIGNATURE_1,
							};
							modules.transactionPool = {
								getTransactionAndProcessSignature: sinonSandbox
									.stub()
									.resolves(),
							};
							result = await transportInstance.shared.postSignature(query);
							return expect(result)
								.to.have.property('success')
								.which.is.equal(true);
						});
					});

					describe('when getTransactionAndProcessSignature fails', () => {
						const receiveSignatureError = ['Invalid signature body ...'];

						it('should invoke resolve with object { success: false, message: err }', async () => {
							query = {
								signature: SAMPLE_SIGNATURE_1,
							};
							modules.transactionPool = {
								getTransactionAndProcessSignature: sinonSandbox
									.stub()
									.rejects(receiveSignatureError),
							};
							result = await transportInstance.shared.postSignature(query);
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
					beforeEach(async () => {
						query = {
							signatures: [SAMPLE_SIGNATURE_1],
						};
						__private.receiveSignatures = sinonSandbox.stub();
					});

					describe('when library.config.broadcasts.active option is false', () => {
						beforeEach(async () => {
							library.config.broadcasts.active = false;
							transportInstance.shared.postSignatures(query);
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
						beforeEach(async () => {
							transportInstance.shared.postSignatures(query);
						});

						it('should call __private.receiveSignatures with query.signatures as argument', async () =>
							expect(__private.receiveSignatures.calledWith(query.signatures))
								.to.be.true);
					});
					describe('when library.schema.validate fails', () => {
						let validateErr;

						it('should call library.logger.debug with "Invalid signatures body" and err as arguments', async () => {
							validateErr = new Error('Transaction query did not match schema');
							validateErr.code = 'INVALID_FORMAT';
							library.schema.validate = sinonSandbox.stub().returns(false);
							library.schema.getLastErrors = sinonSandbox
								.stub()
								.returns([validateErr]);

							expect(
								transportInstance.shared.postSignatures(query)
							).to.be.rejectedWith([validateErr]);

							return expect(
								library.logger.debug.calledWith('Invalid signatures body', [
									validateErr,
								])
							).to.be.true;
						});
					});
				});

				describe('getSignatures', () => {
					beforeEach(async () => {
						modules.transactionPool.getMultisignatureTransactionList = sinonSandbox
							.stub()
							.returns(multisignatureTransactionsList);

						result = await transportInstance.shared.getSignatures();
					});

					it('should call modules.transactionPool.getMultisignatureTransactionList with true and MAX_SHARED_TRANSACTIONS', async () =>
						expect(
							modules.transactionPool.getMultisignatureTransactionList.calledWith(
								true,
								MAX_SHARED_TRANSACTIONS
							)
						).to.be.true);

					describe('when all transactions returned by modules.transactionPool.getMultisignatureTransactionList are multisignature transactions', () => {
						it('should resolve with result = {success: true, signatures: signatures} where signatures contains all transactions', async () => {
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

					describe('when some transactions returned by modules.transactionPool.getMultisignatureTransactionList are multisignature registration transactions', () => {
						beforeEach(async () => {
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

							modules.transactionPool.getMultisignatureTransactionList = sinonSandbox
								.stub()
								.returns(multisignatureTransactionsList);

							result = await transportInstance.shared.getSignatures();
						});

						it('should resolve with result = {success: true, signatures: signatures} where signatures does not contain multisignature registration transactions', async () => {
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
					beforeEach(async () => {
						result = await transportInstance.shared.getTransactions();
					});

					it('should call modules.transactionPool.getMergedTransactionList with true and MAX_SHARED_TRANSACTIONS', async () =>
						expect(
							modules.transactionPool.getMergedTransactionList.calledWith(
								true,
								MAX_SHARED_TRANSACTIONS
							)
						).to.be.true);

					it('should resolve with result = {success: true, transactions: transactions}', async () => {
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
					beforeEach(async () => {
						query = {
							transaction,
						};

						__private.receiveTransaction = sinonSandbox
							.stub()
							.resolves(transaction.id);

						result = await transportInstance.shared.postTransaction(query);
					});

					it('should call __private.receiveTransaction with query.transaction as argument', async () =>
						expect(__private.receiveTransaction.calledWith(query.transaction))
							.to.be.true);

					describe('when __private.receiveTransaction succeeds', () => {
						it('should resolve with object { success: true, transactionId: id }', async () => {
							expect(result)
								.to.have.property('transactionId')
								.which.is.a('string');
							return expect(result)
								.to.have.property('success')
								.which.is.equal(true);
						});
					});

					describe('when __private.receiveTransaction fails', () => {
						const receiveTransactionError = new Error(
							'Invalid transaction body ...'
						);

						beforeEach(async () => {
							__private.receiveTransaction = sinonSandbox
								.stub()
								.rejects(receiveTransactionError);

							result = await transportInstance.shared.postTransaction(query);
						});

						it('should resolve with object { success: false, message: err }', async () => {
							expect(result)
								.to.have.property('success')
								.which.is.equal(false);
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveTransactionError);
						});
					});

					describe('when __private.receiveTransaction fails with "Transaction pool is full"', () => {
						const receiveTransactionError = new Error(
							'Transaction pool is full'
						);

						beforeEach(async () => {
							__private.receiveTransaction = sinonSandbox
								.stub()
								.rejects(receiveTransactionError);

							result = await transportInstance.shared.postTransaction(query);
						});

						it('should resolve with object { success: false, message: err }', async () => {
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
						beforeEach(async () => {
							library.config.broadcasts.active = false;
							return transportInstance.shared.postTransactions(query);
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
						beforeEach(async () => {
							query = {
								transactions: transactionsList,
							};
							__private.receiveTransactions = sinonSandbox.stub();
							return transportInstance.shared.postTransactions(query);
						});

						it('should call __private.receiveTransactions with query.transaction as argument', async () =>
							expect(
								__private.receiveTransactions.calledWith(query.transactions)
							).to.be.true);
					});

					describe('when library.schema.validate fails', () => {
						it('should resolve with error = null and result = {success: false, message: message}', async () => {
							const validateErr = new Error(
								'Transaction query did not match schema'
							);
							validateErr.code = 'INVALID_FORMAT';
							library.schema.validate = sinonSandbox.stub().returns(false);
							library.schema.getLastErrors = sinonSandbox
								.stub()
								.returns([validateErr]);

							return expect(
								transportInstance.shared.postTransactions(query)
							).to.be.rejectedWith([validateErr]);
						});
					});
				});
			});
		});
	});
});
