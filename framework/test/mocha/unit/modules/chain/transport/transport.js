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

const chai = require('chai');
const { TransferTransaction } = require('@liskhq/lisk-transactions');
const BigNum = require('@liskhq/bignum');
const { transfer, TransactionError } = require('@liskhq/lisk-transactions');
const { validator } = require('@liskhq/lisk-validator');
const accountFixtures = require('../../../../fixtures/accounts');
const { Block, GenesisBlock } = require('../../../../fixtures/blocks');
const {
	Transport: TransportModule,
} = require('../../../../../../src/modules/chain/transport');
const jobsQueue = require('../../../../../../src/modules/chain/utils/jobs_queue');
const {
	devnetNetworkIdentifier: networkIdentifier,
} = require('../../../../common/network_identifier');

const expect = chai.expect;

describe('transport', () => {
	const { releaseLimit } = __testContext.config.modules.chain.broadcasts;

	let storageStub;
	let loggerStub;
	let synchronizerStub;
	let channelStub;
	let transportModule;
	let transaction;
	let block;
	let blocksList;
	let transactionsList;
	let multisignatureTransactionsList;
	let blockMock;
	let error;
	let result;
	let query = { ids: ['1', '2', '3'] };

	const SAMPLE_SIGNATURE_1 = {
		transactionId: '222675625422353767',
		publicKey:
			'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
		signature:
			'32636139613731343366633732316664633534306665663839336232376538643634386432323838656661363165353632363465646630316132633233303739',
	};

	beforeEach(async () => {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

		transaction = transfer({
			networkIdentifier,
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});
		const transactionOne = transfer({
			networkIdentifier,
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});
		const transactionTwo = transfer({
			networkIdentifier,
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
			entities: {
				Block: {
					get: sinonSandbox.stub().resolves(),
				},
				Transaction: {
					isPersisted: sinonSandbox.stub(),
					get: sinonSandbox.stub(),
				},
			},
		};

		synchronizerStub = {
			isActive: false,
		};

		loggerStub = {
			debug: sinonSandbox.spy(),
			error: sinonSandbox.stub(),
			info: sinonSandbox.spy(),
			trace: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
		};

		channelStub = {
			publish: sinonSandbox.stub(),
			invoke: sinonSandbox.stub(),
		};

		sinonSandbox.stub(jobsQueue, 'register');
		sinonSandbox.stub(validator, 'validate').returns(true);

		transportModule = new TransportModule({
			channel: channelStub,
			logger: loggerStub,
			storage: storageStub,
			applicationState: {},
			exceptions: __testContext.config.modules.chain.exceptions,
			synchronizer: synchronizerStub,
			transactionPoolModule: {
				getMultisignatureTransactionList: sinonSandbox.stub(),
				getMergedTransactionList: sinonSandbox.stub(),
				getTransactionAndProcessSignature: sinonSandbox.stub(),
				processUnconfirmedTransaction: sinonSandbox.stub(),
				findInTransactionPool: sinonSandbox.stub(),
			},
			blocksModule: {
				lastBlock: sinonSandbox
					.stub()
					.returns({ height: 1, version: 1, timestamp: 1 }),
				receiveBlockFromNetwork: sinonSandbox.stub(),
				loadBlocksFromLastBlockId: sinonSandbox.stub(),
				verifyTransactions: sinonSandbox
					.stub()
					.resolves({ transactionsResponses: [{ status: 1, errors: [] }] }),
				validateTransactions: sinonSandbox
					.stub()
					.resolves({ transactionsResponses: [{ status: 1, errors: [] }] }),
				processTransactions: sinonSandbox
					.stub()
					.resolves({ transactionsResponses: [{ status: 1, errors: [] }] }),
				deserializeTransaction: sinonSandbox.stub().callsFake(val => val),
			},
			processorModule: {
				validate: sinonSandbox.stub(),
				process: sinonSandbox.stub(),
				deserialize: sinonSandbox.stub(),
			},
			loaderModule: {
				syncing: sinonSandbox.stub().returns(false),
			},
			broadcasts: __testContext.config.modules.chain.broadcasts,
		});
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		describe('transportModule', () => {
			it('should assign scope variables when instantiating', async () => {
				expect(transportModule)
					.to.have.property('storage')
					.which.is.equal(storageStub);
				expect(transportModule)
					.to.have.property('logger')
					.which.is.equal(loggerStub);
				expect(transportModule)
					.to.have.property('channel')
					.which.is.equal(channelStub);
				expect(transportModule).to.have.property('broadcaster');
			});
		});
	});

	describe('private', () => {
		describe('_obtainUnknownTransactionIDs', () => {
			let resultTransactionsIDsCheck;

			beforeEach(async () => {
				query = {
					transactionIds: transactionsList.map(tx => tx.id),
				};
			});

			describe('when transaction is neither in the queues, nor in the database', () => {
				beforeEach(async () => {
					transportModule.transactionPoolModule.transactionInPool = sinonSandbox
						.stub()
						.returns(false);
					transportModule.storage.entities.Transaction.get = sinonSandbox
						.stub()
						.resolves([]);
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.transactionIds,
					);
				});

				it('should call transactionPoolModule.transactionInPool with query.transaction.ids as arguments', async () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule.transactionPoolModule.transactionInPool,
						).to.be.calledWith(transactionToCheck.id);
					}
				});

				it('should call storage.entities.Transaction.get with query.transaction.ids as arguments', async () => {
					expect(
						transportModule.storage.entities.Transaction.get,
					).to.be.calledWithExactly(
						{ id_in: transactionsList.map(tx => tx.id) },
						{ limit: transportModule.constants.broadcasts.releaseLimit },
					);
				});

				it('should return array of transactions ids', async () =>
					expect(resultTransactionsIDsCheck).to.include.members([
						transactionsList[0].id,
						transactionsList[1].id,
					]));
			});

			describe('when transaction is in the queues', () => {
				beforeEach(async () => {
					transportModule.transactionPoolModule.transactionInPool = sinonSandbox
						.stub()
						.returns(true);
					transportModule.storage.entities.Transaction.get = sinonSandbox.stub();
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.transactionIds,
					);
				});

				it('should call transactionPoolModule.transactionInPool with query.transaction.ids as arguments', async () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule.transactionPoolModule.transactionInPool,
						).to.be.calledWith(transactionToCheck.id);
					}
				});

				it('should not call storage.entities.Transaction.get', async () =>
					expect(transportModule.storage.entities.Transaction.get).to.have.not
						.been.called);

				it('should return empty array', async () =>
					expect(resultTransactionsIDsCheck).to.be.an('array').empty);
			});

			describe('when transaction exists in the database', () => {
				beforeEach(async () => {
					transportModule.transactionPoolModule.transactionInPool = sinonSandbox
						.stub()
						.returns(false);
					transportModule.storage.entities.Transaction.get = sinonSandbox
						.stub()
						.resolves(transactionsList);
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.transactionIds,
					);
				});

				it('should call transactionPoolModule.transactionInPool with query.transaction.ids as arguments', async () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule.transactionPoolModule.transactionInPool,
						).to.be.calledWith(transactionToCheck.id);
					}
				});

				it('should call storage.entities.Transaction.get with query.transaction.ids as arguments', async () => {
					expect(
						transportModule.storage.entities.Transaction.get,
					).to.be.calledWithExactly(
						{ id_in: transactionsList.map(tx => tx.id) },
						{ limit: transportModule.constants.broadcasts.releaseLimit },
					);
				});

				it('should return empty array', async () =>
					expect(resultTransactionsIDsCheck).to.be.an('array').empty);
			});
		});

		describe('_receiveTransaction', () => {
			beforeEach(async () => {
				transportModule.transactionPoolModule.processUnconfirmedTransaction.resolves();
			});

			afterEach(() => sinonSandbox.restore());

			it('should call validateTransactions', async () => {
				await transportModule._receiveTransaction(transaction);
				return expect(transportModule.blocksModule.validateTransactions).to.be
					.calledOnce;
			});

			it('should call validateTransactions with an array of transactions', async () => {
				await transportModule._receiveTransaction(transaction);
				return expect(
					transportModule.blocksModule.validateTransactions,
				).to.have.been.calledWith([transaction]);
			});

			it('should reject with error if transaction is not allowed', async () => {
				const errorMessage = new Error(
					'Transaction type 0 is currently not allowed.',
				);

				transportModule.blocksModule.validateTransactions.resolves({
					transactionsResponses: [
						{
							errors: [errorMessage],
						},
					],
				});

				return expect(
					transportModule._receiveTransaction(transaction),
				).to.be.rejectedWith([errorMessage]);
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(async () => {
					await transportModule._receiveTransaction(transaction);
				});

				it('should call modules.transactionPool.processUnconfirmedTransaction with transaction and true as arguments', async () =>
					expect(
						transportModule.transactionPoolModule.processUnconfirmedTransaction.calledWith(
							transaction,
							true,
						),
					).to.be.true);
			});

			describe('when transaction is invalid', () => {
				let invalidTransaction;
				let errorResult;

				beforeEach(async () => {
					invalidTransaction = {
						...transaction,
						asset: {},
					};
					transportModule.blocksModule.validateTransactions.resolves({
						transactionsResponses: [
							{
								status: 1,
								errors: [new TransactionError('invalid transaction')],
							},
						],
					});

					try {
						await transportModule._receiveTransaction(invalidTransaction);
					} catch (err) {
						errorResult = err;
					}
				});

				it('should call the call back with error message', async () => {
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

					transportModule.transactionPoolModule.processUnconfirmedTransaction.rejects(
						[new Error(processUnconfirmedTransactionError)],
					);

					try {
						await transportModule._receiveTransaction(transaction);
					} catch (err) {
						error = err;
					}
				});

				it('should call transportModule.logger.debug with "Transaction ${transaction.id}" and error string', async () => {
					expect(transportModule.logger.debug).to.be.calledWith(
						`Transaction ${transaction.id}`,
						`Error: ${processUnconfirmedTransactionError}`,
					);
				});

				describe('when transaction is defined', () => {
					it('should call transportModule.logger.debug with "Transaction" and transaction as arguments', async () => {
						expect(transportModule.logger.debug).to.be.calledWith(
							{
								transaction,
							},
							'Transaction',
						);
					});
				});

				it('should reject with error', async () => {
					expect(error).to.be.an('array');
					expect(error[0].message).to.equal(processUnconfirmedTransactionError);
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', () => {
				beforeEach(async () => {
					result = await transportModule._receiveTransaction(transaction);
				});

				it('should resolve with result = transaction.id', async () =>
					expect(result).to.equal(transaction.id));

				it('should call transportModule.logger.debug with "Received transaction " + transaction.id', async () =>
					expect(
						transportModule.logger.debug.calledWith(
							{ id: transaction.id },
							'Received transaction',
						),
					).to.be.true);
			});
		});

		describe('Transport', () => {
			beforeEach(async () => {
				blocksList = [];
				for (let j = 0; j < 10; j++) {
					const auxBlock = new Block();
					blocksList.push(auxBlock);
				}
			});

			describe('onSignature', () => {
				describe('when broadcast is defined', () => {
					beforeEach(async () => {
						transportModule.broadcaster = {
							enqueueSignatureObject: sinonSandbox.stub(),
						};
						transportModule.handleBroadcastSignature(SAMPLE_SIGNATURE_1, true);
					});

					it('should call transportModule.broadcaster.enqueueSignatureObject with signature', () => {
						expect(
							transportModule.broadcaster.enqueueSignatureObject.calledOnce,
						).to.be.true;
						return expect(
							transportModule.broadcaster.enqueueSignatureObject,
						).calledWith(SAMPLE_SIGNATURE_1);
					});

					it('should call transportModule.channel.publish with "chain:signature:change" and signature', async () => {
						expect(transportModule.channel.publish).to.be.calledOnce;
						expect(transportModule.channel.publish).to.be.calledWith(
							'chain:signature:change',
							SAMPLE_SIGNATURE_1,
						);
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
					transportModule.broadcaster = {
						enqueueTransactionId: sinonSandbox.stub(),
					};
					transportModule.channel = {
						invoke: sinonSandbox.stub(),
						publish: sinonSandbox.stub(),
					};
					transportModule.handleBroadcastTransaction(transaction, true);
				});

				describe('when broadcast is defined', () => {
					beforeEach(async () => {
						transportModule.broadcaster = {
							enqueueTransactionId: sinonSandbox.stub(),
						};
						transportModule.channel = {
							invoke: sinonSandbox.stub(),
							publish: sinonSandbox.stub(),
						};
						transportModule.handleBroadcastTransaction(transaction, true);
					});

					it('should call transportModule.broadcaster.enqueueTransactionId transactionId', async () => {
						expect(transportModule.broadcaster.enqueueTransactionId).to.be
							.calledOnce;
						return expect(
							transportModule.broadcaster.enqueueTransactionId,
						).to.be.calledWith(transaction.id);
					});

					it('should call transportModule.channel.publish with "chain:transactions:change" and transaction as arguments', async () => {
						expect(transportModule.channel.publish).to.be.calledOnce;
						expect(transportModule.channel.publish).to.be.calledWith(
							'chain:transactions:change',
							transaction.toJSON(),
						);
					});
				});
			});

			describe('handleBroadcastBlock', () => {
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
						transportModule.broadcaster = {
							enqueue: sinonSandbox.stub(),
							broadcast: sinonSandbox.stub(),
						};
						return transportModule.handleBroadcastBlock(block);
					});

					it('should call channel.invoke to send', () => {
						expect(channelStub.invoke).to.be.calledOnce;
						return expect(channelStub.invoke).to.be.calledWith('network:send', {
							event: 'postBlock',
							data: {
								block,
							},
						});
					});

					describe('when modules.synchronizer.isActive = true', () => {
						beforeEach(async () => {
							transportModule.synchronizer.isActive = true;
							transportModule.handleBroadcastBlock(block);
						});

						it('should call transportModule.logger.debug with proper error message', () => {
							return expect(
								transportModule.logger.debug.calledWith(
									'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
								),
							).to.be.true;
						});
					});
				});
			});

			describe('Transport.prototype.shared', () => {
				describe('handleRPCGetBlocksFromId', () => {
					describe('when query is undefined', () => {
						it('should throw a validation error', async () => {
							query = {};

							try {
								await transportModule.handleRPCGetBlocksFromId(query);
							} catch (e) {
								expect(e[0].message).to.equal(
									"should have required property 'blockId'",
								);
							}
						});
					});

					describe('when query is defined', () => {
						it('should call modules.blocks.loadBlocksFromLastBlockId with lastBlockId and limit 34', async () => {
							query = {
								blockId: '6258354802676165798',
							};

							await transportModule.handleRPCGetBlocksFromId(query);
							return expect(
								transportModule.blocksModule.loadBlocksFromLastBlockId,
							).to.be.calledWith(query.blockId, 34);
						});
					});

					describe('when modules.blocks.loadBlocksFromLastBlockId fails', () => {
						it('should throw an error', async () => {
							query = {
								blockId: '6258354802676165798',
							};

							const errorMessage = 'Failed to load blocks...';
							const loadBlockFailed = new Error(errorMessage);

							transportModule.blocksModule.loadBlocksFromLastBlockId.rejects(
								loadBlockFailed,
							);

							try {
								await transportModule.handleRPCGetBlocksFromId(query);
							} catch (e) {
								expect(e.message).to.equal(errorMessage);
							}
						});
					});
				});

				describe('handleEventPostBlock', () => {
					let postBlockQuery;

					beforeEach(async () => {
						postBlockQuery = {
							block: blockMock,
						};
					});

					describe('when transportModule.config.broadcasts.active option is false', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = false;
							await transportModule.handleEventPostBlock(postBlockQuery);
						});

						it('should call transportModule.logger.debug', async () =>
							expect(
								transportModule.logger.debug.calledWith(
									'Receiving blocks disabled by user through config.json',
								),
							).to.be.true);

						it('should not call validator.validate; function should return before', async () =>
							expect(validator.validate.called).to.be.false);
					});

					describe('when query is specified', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = true;
						});

						describe('when it throws', () => {
							const blockValidationError = 'should match format "id"';

							it('should throw an error', async () => {
								try {
									await transportModule.handleEventPostBlock(postBlockQuery);
								} catch (err) {
									expect(err[0].message).to.equal(blockValidationError);
								}
							});
						});

						describe('when it does not throw', () => {
							const genesisBlock = new GenesisBlock();
							genesisBlock.previousBlockId = genesisBlock.id; // So validations pass

							describe('when query.block is defined', () => {
								it('should call modules.blocks.addBlockProperties with query.block', async () => {
									await transportModule.handleEventPostBlock({
										block: genesisBlock,
									});
									expect(
										transportModule.processorModule.deserialize.calledWith(
											genesisBlock,
										),
									).to.be.true;
								});
							});

							it('should call transportModule.processorModule.process with block', async () => {
								const blockWithProperties = {};
								transportModule.processorModule.deserialize.resolves(
									blockWithProperties,
								);
								await transportModule.handleEventPostBlock(
									{
										block: genesisBlock,
									},
									'127.0.0.1:5000',
								);
								expect(
									transportModule.processorModule.process,
								).to.be.calledWithExactly(blockWithProperties, {
									peerId: '127.0.0.1:5000',
								});
							});
						});
					});
				});

				describe('handleEventPostSignature', () => {
					describe('when getTransactionAndProcessSignature succeeds', () => {
						it('should invoke resolve with empty object {}', async () => {
							query = {
								signature: SAMPLE_SIGNATURE_1,
							};
							transportModule.transactionPoolModule.getTransactionAndProcessSignature.resolves();
							result = await transportModule.handleEventPostSignature(query);
							return expect(result).to.eql({});
						});
					});

					describe('when getTransactionAndProcessSignature fails', () => {
						const receiveSignatureError = [
							new Error('Invalid signature body ...'),
						];

						it('should invoke resolve with object { message: err }', async () => {
							query = {
								signature: SAMPLE_SIGNATURE_1,
							};
							transportModule.transactionPoolModule.getTransactionAndProcessSignature.rejects(
								receiveSignatureError,
							);
							result = await transportModule.handleEventPostSignature(query);
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveSignatureError);
						});
					});
				});

				describe('handleRPCGetSignatures', () => {
					beforeEach(async () => {
						transportModule.transactionPoolModule.getMultisignatureTransactionList = sinonSandbox
							.stub()
							.returns(multisignatureTransactionsList);

						result = await transportModule.handleRPCGetSignatures();
					});

					it('should call modules.transactionPool.getMultisignatureTransactionList with true and releaseLimit', async () => {
						expect(
							transportModule.transactionPoolModule
								.getMultisignatureTransactionList,
						).calledWith(true, releaseLimit);
					});

					describe('when all transactions returned by modules.transactionPool.getMultisignatureTransactionList are multisignature transactions', () => {
						it('should resolve with result = {signatures: signatures} where signatures contains all transactions', async () => {
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

							transportModule.transactionPoolModule.getMultisignatureTransactionList = sinonSandbox
								.stub()
								.returns(multisignatureTransactionsList);

							result = await transportModule.handleRPCGetSignatures();
						});

						it('should resolve with result = {signatures: signatures} where signatures does not contain multisignature registration transactions', async () => {
							return expect(result)
								.to.have.property('signatures')
								.which.is.an('array')
								.that.has.property('length')
								.which.equals(1);
						});
					});
				});

				describe('handleEventPostTransaction', () => {
					beforeEach(async () => {
						query = {
							transaction,
						};

						transportModule._receiveTransaction = sinonSandbox
							.stub()
							.resolves(transaction.id);

						result = await transportModule.handleEventPostTransaction(query);
					});

					it('should call transportModule._receiveTransaction with query.transaction as argument', async () =>
						expect(
							transportModule._receiveTransaction.calledWith(query.transaction),
						).to.be.true);

					describe('when transportModule._receiveTransaction succeeds', () => {
						it('should resolve with object { transactionId: id }', async () => {
							return expect(result)
								.to.have.property('transactionId')
								.which.is.a('string');
						});
					});

					describe('when transportModule._receiveTransaction fails', () => {
						const receiveTransactionError = new Error(
							'Invalid transaction body ...',
						);

						beforeEach(async () => {
							transportModule._receiveTransaction = sinonSandbox
								.stub()
								.rejects(receiveTransactionError);

							result = await transportModule.handleEventPostTransaction(query);
						});

						it('should resolve with object { message: err }', async () => {
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveTransactionError);
						});
					});

					describe('when transportModule._receiveTransaction fails with "Transaction pool is full"', () => {
						const receiveTransactionError = new Error(
							'Transaction pool is full',
						);

						beforeEach(async () => {
							transportModule._receiveTransaction = sinonSandbox
								.stub()
								.rejects(receiveTransactionError);

							result = await transportModule.handleEventPostTransaction(query);
						});

						it('should resolve with object { message: err }', async () => {
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveTransactionError);
						});
					});
				});
			});
		});
	});
});
