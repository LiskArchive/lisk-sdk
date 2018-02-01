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

var rewire = require('rewire');
var chai = require('chai');
var expect = chai.expect;

var swaggerHelper = require('../../../helpers/swagger');
var TransportModule = rewire('../../../modules/transport.js');

// TODO: Sometimes the callback error is null, other times it's undefined. It should be consistent.
describe('transport', () => {
	var dbStub;
	var loggerStub;
	var busStub;
	var schemaStub;
	var networkStub;
	var balancesSequenceStub;
	var transactionStub;
	var blockStub;
	var peersStub;
	var broadcasterStubRef;
	var transportInstance;
	var library;
	var __private;
	var modules;
	var defaultScope;
	var restoreRewiredTopDeps;
	var peerStub;
	var definitions;

	const SAMPLE_SIGNATURE_1 =
		'32636139613731343366633732316664633534306665663839336232376538643634386432323838656661363165353632363465646630316132633233303739';
	const SAMPLE_SIGNATURE_2 =
		'61383939393932343233383933613237653864363438643232383865666136316535363236346564663031613263323330373784192003750382840553137595';

	beforeEach(done => {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

		dbStub = {
			query: sinonSandbox.spy(),
		};

		loggerStub = {
			debug: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
		};

		busStub = {};
		schemaStub = {};
		networkStub = {};
		balancesSequenceStub = {
			add: () => {},
		};

		transactionStub = {
			attachAssetType: sinonSandbox.stub(),
		};

		blockStub = {};
		peersStub = {};

		restoreRewiredTopDeps = TransportModule.__set__({
			Broadcaster: function() {
				this.bind = () => {};
				broadcasterStubRef = this;
			},
		});

		defaultScope = {
			logic: {
				block: blockStub,
				transaction: transactionStub,
				peers: peersStub,
			},
			db: dbStub,
			logger: loggerStub,
			bus: busStub,
			schema: schemaStub,
			network: networkStub,
			balancesSequence: balancesSequenceStub,
			config: {
				peers: {
					options: {
						timeout: 1234,
					},
				},
				forging: {},
				broadcasts: {
					broadcastInterval: 10000,
					releaseLimit: 10,
				},
			},
		};

		peerStub = {
			nonce: 'sYHEDBKcScaAAAYg',
		};

		swaggerHelper.getResolvedSwaggerSpec().then(resolvedSpec => {
			defaultScope.swagger = {
				definitions: resolvedSpec.definitions,
			};
			done();
		});
	});

	afterEach(done => {
		restoreRewiredTopDeps();
		done();
	});

	describe('constructor', () => {
		describe('library', () => {
			var localTransportInstance;
			var error;
			var transportSelf;

			beforeEach(done => {
				localTransportInstance = new TransportModule((err, transport) => {
					error = err;
					transportSelf = transport;
					library = TransportModule.__get__('library');
					__private = TransportModule.__get__('__private');

					transportSelf.onBind(defaultScope);

					done();
				}, defaultScope);
			});

			it('should assign scope variables when instantiating', () => {
				expect(library)
					.to.have.property('db')
					.which.is.equal(dbStub);
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
					.to.have.property('network')
					.which.is.equal(networkStub);
				expect(library)
					.to.have.property('balancesSequence')
					.which.is.equal(balancesSequenceStub);
				expect(library)
					.to.have.nested.property('logic.block')
					.which.is.equal(blockStub);
				expect(library)
					.to.have.nested.property('logic.transaction')
					.which.is.equal(transactionStub);
				expect(library)
					.to.have.nested.property('logic.peers')
					.which.is.equal(peersStub);
				expect(library)
					.to.have.nested.property('config.peers.options.timeout')
					.which.is.equal(1234);

				expect(__private)
					.to.have.property('broadcaster')
					.which.is.equal(broadcasterStubRef);

				expect(error).to.equal(null);
				expect(transportSelf).to.equal(localTransportInstance);
			});
		});
	});

	describe('__private', () => {
		var __privateOriginal;
		var restoreRewiredDeps;

		beforeEach(done => {
			__privateOriginal = {};

			transportInstance = new TransportModule((err, transportSelf) => {
				// Backup the __private variable so that properties can be overridden
				// by individual test cases and then we will restore them after each test case has run.
				// This is neccessary because different test cases may want to stub out different parts of the
				// __private modules while testing other parts.
				__private = TransportModule.__get__('__private');

				Object.keys(__private).forEach(field => {
					__privateOriginal[field] = __private[field];
				});

				transportSelf.onBind(defaultScope);

				library = {
					schema: {
						validate: sinonSandbox.stub().callsArg(2),
					},
					logger: {
						debug: sinonSandbox.spy(),
					},
				};

				modules = {
					peers: {
						remove: sinonSandbox.stub().returns(true),
					},
					transactions: {
						processUnconfirmedTransaction: sinonSandbox.stub().callsArg(2),
					},
				};

				definitions = {};

				restoreRewiredDeps = TransportModule.__set__({
					library: library,
					modules: modules,
					definitions: definitions,
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

		describe('removePeer', () => {
			describe('when options.peer is undefined', () => {
				var result;

				beforeEach(done => {
					result = __private.removePeer({}, 'Custom peer remove message');
					done();
				});

				it('should call library.logger.debug with "Cannot remove empty peer"', () => {
					expect(library.logger.debug.called).to.be.true;
					expect(library.logger.debug.calledWith('Cannot remove empty peer')).to
						.be.true;
				});

				it('should return false', () => {
					expect(result).to.be.false;
				});
			});

			describe('when options.peer is defined', () => {
				var removeSpy;
				var peerData;

				beforeEach(done => {
					removeSpy = sinonSandbox.spy();

					modules.peers = {
						remove: removeSpy,
					};

					peerData = {
						ip: '127.0.0.1',
						wsPort: 8000,
					};

					__private.removePeer(
						{
							peer: peerData,
						},
						'Custom peer remove message'
					);
					done();
				});

				it('should call library.logger.debug', () => {
					expect(library.logger.debug.called).to.be.true;
				});

				it('should call modules.peers.remove with options.peer', () => {
					expect(removeSpy.calledWith(peerData)).to.be.true;
				});
			});
		});

		describe('receiveSignatures', () => {
			describe('when signatures array is empty', () => {
				beforeEach(done => {
					__private.receiveSignature = sinonSandbox.stub().callsArg(1);
					__private.receiveSignatures(
						{
							signatures: [],
						},
						() => {
							done();
						}
					);
				});

				it('should call library.schema.validate with empty query.signatures', () => {
					expect(library.schema.validate.called).to.be.true;
				});
			});

			describe('when signatures array contains multiple signatures', () => {
				beforeEach(done => {
					definitions.Signature = {
						id: 'transport.signatures',
						type: 'object',
						properties: {
							signatures: {
								type: 'array',
								minItems: 1,
								maxItems: 40,
							},
						},
						required: ['signatures'],
					};
					__private.receiveSignature = sinonSandbox.stub().callsArg(1);
					__private.receiveSignatures(
						{
							signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
						},
						() => {
							done();
						}
					);
				});

				it('should call library.schema.validate with custom schema.signatures', () => {
					expect(library.schema.validate.called).to.be.true;
				});
			});

			describe('when library.schema.validate fails', () => {
				var error;
				var validateErr;

				beforeEach(done => {
					validateErr = new Error('Transaction did not match schema');
					validateErr.code = 'INVALID_FORMAT';
					library.schema.validate = sinonSandbox
						.stub()
						.callsArgWith(2, [validateErr]);

					__private.receiveSignatures(
						{
							signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
						},
						err => {
							error = err;
							done();
						}
					);
				});

				it('should call series callback with error = "Invalid signatures body"', () => {
					expect(library.schema.validate.called).to.be.true;
					expect(error).to.equal('Invalid signatures body');
				});
			});

			describe('when library.schema.validate succeeds', () => {
				describe('for every signature in signatures', () => {
					describe('when __private.receiveSignature succeeds', () => {
						var error;

						beforeEach(done => {
							__private.receiveSignature = sinonSandbox.stub().callsArg(1);
							__private.receiveSignatures(
								{
									signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
								},
								err => {
									error = err;
									done();
								}
							);
						});

						it('should call __private.receiveSignature with signature', () => {
							expect(library.schema.validate.called).to.be.true;
							expect(__private.receiveSignature.calledTwice).to.be.true;
							expect(__private.receiveSignature.calledWith(SAMPLE_SIGNATURE_1))
								.to.be.true;
							expect(__private.receiveSignature.calledWith(SAMPLE_SIGNATURE_2))
								.to.be.true;
						});

						it('should call callback with error null', () => {
							expect(error).to.equal(null);
						});
					});

					describe('when __private.receiveSignature fails', () => {
						var error;
						var receiveSignatureError;

						beforeEach(done => {
							receiveSignatureError =
								'Error processing signature: Error message';
							__private.receiveSignature = sinonSandbox
								.stub()
								.callsArgWith(1, receiveSignatureError);
							__private.receiveSignatures(
								{
									signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
								},
								err => {
									error = err;
									done();
								}
							);
						});

						it('should call library.logger.debug with err and signature', () => {
							expect(library.schema.validate.called).to.be.true;
							// If any of the __private.receiveSignature calls fail, the whole
							// receiveSignatures operation should fail immediately.
							expect(__private.receiveSignature.calledOnce).to.be.true;
							expect(library.logger.debug.calledWith(error, SAMPLE_SIGNATURE_1))
								.to.be.true;
						});

						it('should call callback with error', () => {
							expect(error).to.equal(receiveSignatureError);
						});
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
					processSignature: sinonSandbox.stub().callsArg(1),
				};

				done();
			});

			describe('when library.schema.validate succeeds', () => {
				describe('when modules.multisignatures.processSignature succeeds', () => {
					var error;

					beforeEach(done => {
						modules.multisignatures.processSignature = sinonSandbox
							.stub()
							.callsArg(1);

						__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
							error = err;
							done();
						});
					});

					it('should call library.schema.validate with signature', () => {
						expect(error).to.equal(undefined);
						expect(library.schema.validate.calledOnce).to.be.true;
						expect(library.schema.validate.calledWith(SAMPLE_SIGNATURE_1)).to.be
							.true;
					});

					it('should call modules.multisignatures.processSignature with signature', () => {
						expect(error).to.equal(undefined);
						expect(
							modules.multisignatures.processSignature.calledWith(
								SAMPLE_SIGNATURE_1
							)
						).to.be.true;
					});

					it('should call callback with error = undefined', () => {
						expect(error).to.equal(undefined);
					});
				});

				describe('when modules.multisignatures.processSignature fails', () => {
					var error;
					var processSignatureError;

					beforeEach(done => {
						processSignatureError = 'Transaction not found';
						modules.multisignatures.processSignature = sinonSandbox
							.stub()
							.callsArgWith(1, processSignatureError);

						__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
							error = err;
							done();
						});
					});

					it('should call callback with error', () => {
						expect(error).to.equal(
							`Error processing signature: ${processSignatureError}`
						);
					});
				});
			});

			describe('when library.schema.validate fails', () => {
				var error;
				var validateErr;

				beforeEach(done => {
					validateErr = new Error('Transaction did not match schema');
					validateErr.code = 'INVALID_FORMAT';
					library.schema.validate = sinonSandbox
						.stub()
						.callsArgWith(2, [validateErr]);

					__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
						error = err;
						done();
					});
				});

				it('should call callback with error = "Invalid signature body"', () => {
					expect(error).to.equal(
						`Invalid signature body ${validateErr.message}`
					);
				});
			});
		});

		describe('receiveTransactions', () => {
			var query;

			beforeEach(done => {
				library.schema = {
					validate: sinonSandbox.stub().callsArg(2),
				};
				library.logger = {
					debug: sinonSandbox.spy(),
				};
				modules.peers = {
					remove: sinonSandbox.stub().returns(true),
				};

				query = {
					transactions: [
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
							signature:
								'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
						},
					],
				};

				__private.receiveTransaction = sinonSandbox.stub().callsArg(3);

				done();
			});

			// TODO: It doesn't seem that library.schema.validate currently gets called by the __private.receiveTransaction logic.
			describe.skip('when library.schema.validate fails', () => {
				var validateErr;

				beforeEach(done => {
					validateErr = new Error('Transaction did not match schema');
					validateErr.code = 'INVALID_FORMAT';
					library.schema.validate = sinonSandbox
						.stub()
						.callsArgWith(2, [validateErr]);

					__private.receiveTransactions(query, peerStub, '', () => {
						done();
					});
				});

				it('should call callback with error = "Invalid transactions body"', () => {
					// TODO: Check that error is what we expect it to be.
					expect(library.schema.validate.called).to.be.true;
				});
			});

			describe('when library.schema.validate succeeds', () => {
				describe.skip('when called', () => {
					var error;

					beforeEach(done => {
						__private.receiveTransactions(query, peerStub, '', err => {
							error = err;
							done();
						});
					});

					// TODO: It doesn't seem that library.schema.validate currently gets called by the __private.receiveTransaction logic.
					it.skip('should call library.schema.validate with query and definitions.Transaction', () => {
						expect(error).to.equal(null);
						expect(
							library.schema.validate.calledWith(
								query,
								defaultScope.swagger.definitions.Transaction
							)
						).to.be.true;
					});
				});

				describe('for every transaction in transactions', () => {
					describe('when transaction is undefined', () => {
						var error;

						beforeEach(done => {
							query.transactions[0] = undefined;
							__private.receiveTransactions(query, peerStub, '', err => {
								error = err;
								done();
							});
						});

						it('should call callback with error = "Unable to process transaction. Transaction is undefined."', () => {
							expect(error).to.equal(
								'Unable to process transaction. Transaction is undefined.'
							);
						});
					});

					describe('when transaction is defined', () => {
						describe('when call __private.receiveTransaction succeeds', () => {
							var error;

							beforeEach(done => {
								__private.receiveTransactions(
									query,
									peerStub,
									'This is a log message',
									err => {
										error = err;
										done();
									}
								);
							});

							it('should set transaction.bundled = true', () => {
								expect(query.transactions[0])
									.to.have.property('bundled')
									.which.equals(true);
							});

							it('should call __private.receiveTransaction with transaction with transaction, peer and extraLogMessage arguments', () => {
								expect(
									__private.receiveTransaction.calledWith(
										query.transactions[0],
										peerStub,
										'This is a log message'
									)
								).to.be.true;
							});

							it('should call callback with error = null', () => {
								expect(error).to.equal(null);
							});
						});

						describe('when call __private.receiveTransaction fails', () => {
							var error;
							var receiveTransactionError;

							beforeEach(done => {
								receiveTransactionError = 'Invalid transaction body - ...';
								__private.receiveTransaction = sinonSandbox
									.stub()
									.callsArgWith(3, receiveTransactionError);

								__private.receiveTransactions(
									query,
									peerStub,
									'This is a log message',
									err => {
										error = err;
										done();
									}
								);
							});

							it('should call library.logger.debug with error and transaction', () => {
								expect(
									library.logger.debug.calledWith(
										receiveTransactionError,
										query.transactions[0]
									)
								).to.be.true;
							});

							it('should call callback with error', () => {
								expect(error).to.equal(receiveTransactionError);
							});
						});
					});
				});
			});
		});

		describe('receiveTransaction', () => {
			var transaction;
			var peerAddressString;

			beforeEach(() => {
				transaction = {
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
				};

				sinonSandbox
					.stub(balancesSequenceStub, 'add')
					.callsFake((callback, doneCallback) => {
						callback(doneCallback);
					});

				peerAddressString = '40.40.40.40:5000';

				library.logic = {
					transaction: {
						objectNormalize: sinonSandbox.stub().returns(transaction),
					},
					peers: {
						peersManager: {
							getAddress: sinonSandbox.stub().returns(peerAddressString),
						},
					},
				};
				library.schema = {
					validate: sinonSandbox.stub().callsArg(2),
				};
				library.logger = {
					debug: sinonSandbox.spy(),
				};
				library.balancesSequence = balancesSequenceStub;

				modules.peers.remove = sinonSandbox.stub().returns(true);
				modules.transactions.processUnconfirmedTransaction = sinonSandbox
					.stub()
					.callsArg(2);
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(done => {
					__private.receiveTransaction(
						transaction,
						peerStub,
						'This is a log message',
						() => {
							done();
						}
					);
				});

				it('should call library.logic.transaction.objectNormalize with transaction', () => {
					expect(
						library.logic.transaction.objectNormalize.calledWith(transaction)
					).to.be.true;
				});

				it('should call library.balancesSequence.add', () => {
					expect(library.balancesSequence.add.called).to.be.true;
				});

				it('should call modules.transactions.processUnconfirmedTransaction with transaction and true as arguments', () => {
					expect(
						modules.transactions.processUnconfirmedTransaction.calledWith(
							transaction,
							true
						)
					).to.be.true;
				});
			});

			describe('when library.logic.transaction.objectNormalize throws', () => {
				var error;
				var extraLogMessage;
				var objectNormalizeError;

				beforeEach(done => {
					extraLogMessage = 'This is a log message';
					objectNormalizeError = 'Unknown transaction type 0';

					library.logic.transaction.objectNormalize = sinonSandbox
						.stub()
						.throws(objectNormalizeError);
					__private.removePeer = sinonSandbox.spy();

					__private.receiveTransaction(
						transaction,
						peerStub,
						extraLogMessage,
						err => {
							error = err;
							done();
						}
					);
				});

				it('should call library.logger.debug with "Transaction normalization failed" error message and error details object', () => {
					var errorDetails = {
						id: transaction.id,
						err: 'Unknown transaction type 0',
						module: 'transport',
						transaction: transaction,
					};
					expect(
						library.logger.debug.calledWith(
							'Transaction normalization failed',
							errorDetails
						)
					).to.be.true;
				});

				it('should call __private.removePeer with peer details object', () => {
					var peerDetails = { peer: peerStub, code: 'ETRANSACTION' };
					expect(__private.removePeer.calledWith(peerDetails, extraLogMessage))
						.to.be.true;
				});

				it('should call callback with error = "Invalid transaction body"', () => {
					expect(error).to.equal(
						`Invalid transaction body - ${objectNormalizeError}`
					);
				});
			});

			describe('when peer is undefined', () => {
				beforeEach(done => {
					__private.receiveTransaction(
						transaction,
						undefined,
						'This is a log message',
						() => {
							done();
						}
					);
				});

				it('should call library.logger.debug with "Received transaction " + transaction.id + " from public client"', () => {
					expect(
						library.logger.debug.calledWith(
							`Received transaction ${transaction.id} from public client`
						)
					).to.be.true;
				});
			});

			describe('when peer is defined', () => {
				beforeEach(done => {
					__private.receiveTransaction(
						transaction,
						peerStub,
						'This is a log message',
						() => {
							done();
						}
					);
				});

				it('should call library.logger.debug with "Received transaction " + transaction.id + " from peer ..."', () => {
					expect(
						library.logger.debug.calledWith(
							`Received transaction ${
								transaction.id
							} from peer ${peerAddressString}`
						)
					).to.be.true;
				});

				it('should call library.logic.peers.peersManager.getAddress with peer.nonce', () => {
					expect(
						library.logic.peers.peersManager.getAddress.calledWith(
							peerStub.nonce
						)
					).to.be.true;
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction fails', () => {
				var error;
				var processUnconfirmedTransactionError;

				beforeEach(done => {
					processUnconfirmedTransactionError = `Transaction is already processed: ${
						transaction.id
					}`;
					modules.transactions.processUnconfirmedTransaction = sinonSandbox
						.stub()
						.callsArgWith(2, processUnconfirmedTransactionError);

					__private.receiveTransaction(
						transaction,
						peerStub,
						'This is a log message',
						err => {
							error = err;
							done();
						}
					);
				});

				it('should call library.logger.debug with "Transaction ${transaction.id}" and error string', () => {
					expect(
						library.logger.debug.calledWith(
							`Transaction ${transaction.id}`,
							processUnconfirmedTransactionError
						)
					).to.be.true;
				});

				describe('when transaction is defined', () => {
					it('should call library.logger.debug with "Transaction" and transaction as arguments', () => {
						expect(library.logger.debug.calledWith('Transaction', transaction))
							.to.be.true;
					});
				});

				it('should call callback with err.toString()', () => {
					expect(error).to.equal(processUnconfirmedTransactionError);
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', () => {
				var error;
				var result;

				beforeEach(done => {
					__private.receiveTransaction(
						transaction,
						peerStub,
						'This is a log message',
						(err, res) => {
							error = err;
							result = res;
							done();
						}
					);
				});

				it('should call callback with error = null', () => {
					expect(error).to.equal(null);
				});

				it('should call callback with result = transaction.id', () => {
					expect(result).to.equal(transaction.id);
				});
			});
		});
	});

	describe('Transport', () => {
		var restoreRewiredTransportDeps;

		beforeEach(done => {
			transportInstance = new TransportModule((err, transportSelf) => {
				transportSelf.onBind(defaultScope);

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
					},
				};

				modules = {
					peers: {
						calculateConsensus: sinonSandbox.stub().returns(100),
					},
				};

				restoreRewiredTransportDeps = TransportModule.__set__({
					library: library,
					modules: modules,
				});

				done();
			}, defaultScope);
		});

		afterEach(done => {
			restoreRewiredTransportDeps();
			done();
		});

		describe('poorConsensus', () => {
			var isPoorConsensusResult;

			describe('when library.config.forging.force is true', () => {
				beforeEach(done => {
					library.config.forging.force = true;
					isPoorConsensusResult = transportInstance.poorConsensus();
					done();
				});

				it('should return false', () => {
					expect(isPoorConsensusResult).to.be.false;
				});
			});

			describe('when library.config.forging.force is false', () => {
				beforeEach(done => {
					library.config.forging.force = false;
					done();
				});

				describe('when modules.peers.calculateConsensus() < constants.minBroadhashConsensus', () => {
					beforeEach(done => {
						modules.peers.calculateConsensus = sinonSandbox.stub().returns(50);
						isPoorConsensusResult = transportInstance.poorConsensus();
						done();
					});

					it('should return true', () => {
						expect(isPoorConsensusResult).to.be.true;
					});
				});

				describe('when modules.peers.calculateConsensus() >= constants.minBroadhashConsensus', () => {
					beforeEach(done => {
						modules.peers.calculateConsensus = sinonSandbox.stub().returns(51);
						isPoorConsensusResult = transportInstance.poorConsensus();
						done();
					});

					it('should return false', () => {
						expect(isPoorConsensusResult).to.be.false;
					});
				});
			});
		});

		describe('getPeers', () => {
			var paramsArg = {};
			var callbackArg = {};

			beforeEach(done => {
				__private.broadcaster = {
					getPeers: sinonSandbox.stub().callsArgWith(1, null, []),
				};

				paramsArg = {};
				callbackArg = () => {};

				transportInstance.getPeers(paramsArg, callbackArg);
				done();
			});

			it('should call __private.broadcaster.getPeers with paramsArg and callbackArg as arguments', () => {
				expect(
					__private.broadcaster.getPeers.calledWith(paramsArg, callbackArg)
				).to.be.true;
			});
		});

		describe('onBind', () => {
			describe('modules', () => {
				it('should assign blocks');

				it('should assign dapps');

				it('should assign loader');

				it('should assign multisignatures');

				it('should assign peers');

				it('should assign system');

				it('should assign transaction');
			});

			it('should call System.getHeaders');

			it('should call __private.broadcaster.bind');

			it('should call __private.broadcaster.bind with scope.peers');

			it('should call __private.broadcaster.bind with scope.transport');

			it('should call __private.broadcaster.bind with scope.transactions');
		});

		describe('onSignature', () => {
			describe('when broadcast is defined', () => {
				it('should call __private.broadcaster.maxRelays');

				it('should call __private.broadcaster.maxRelays with signature');

				describe('when result of __private.broadcaster.maxRelays is false', () => {
					it('should call __private.broadcaster.enqueue');

					it('should call __private.broadcaster.enqueue with {}');

					it(
						'should call __private.broadcaster.enqueue with {api: "postSignatures", data: {signature: signature}}'
					);

					it('should call library.network.io.sockets.emit');

					it(
						'should call library.network.io.sockets.emit with "signature/change"'
					);

					it('should call library.network.io.sockets.emit with signature');
				});
			});
		});

		describe('onUnconfirmedTransaction', () => {
			describe('when broadcast is defined', () => {
				it('should call __private.broadcaster.maxRelays');

				it('should call __private.broadcaster.maxRelays with transaction');

				describe('when result of __private.broadcaster.maxRelays is false', () => {
					it('should call __private.broadcaster.enqueue');

					it('should call __private.broadcaster.enqueue with {}');

					it(
						'should call __private.broadcaster.enqueue with {api: "postTransactions", data: {transaction: transaction}}'
					);

					it('should call library.network.io.sockets.emit');

					it(
						'should call library.network.io.sockets.emit with "transactions/change"'
					);

					it('should call library.network.io.sockets.emit with transaction');
				});
			});
		});

		describe('onNewBlock', () => {
			describe('when broadcast is defined', () => {
				it('should call modules.system.update');

				describe('when modules.system.update succeeds', () => {
					it('should call __private.broadcaster.maxRelays');

					it('should call __private.broadcaster.maxRelays with blocks');

					describe('when __private.broadcaster.maxRelays with blocks = true', () => {
						it(
							'should call library.logger.debug with "Broadcasting block aborted - max block relays exceeded"'
						);
					});

					describe('when modules.loader.syncing = true', () => {
						it(
							'should call library.logger.debug with "Broadcasting block aborted - blockchain synchronization in progress"'
						);
					});

					it('should call modules.peers.list');

					it('should call modules.peers.list with {normalized: false}');

					describe('when peers = undefined', () => {
						it(
							'should call library.logger.debug with "Broadcasting block aborted - active peer list empty"'
						);
					});

					describe('when peers.length = 0', () => {
						it(
							'should call library.logger.debug with "Broadcasting block aborted - active peer list empty"'
						);
					});

					it('should call peers.filter');

					it(
						'should call peers.filter with peer.state === Peer.STATE.CONNECTED'
					);

					describe('for every filtered peer in peers', () => {
						it('should call peer.rpc.updateMyself');

						it('should call peer.rpc.updateMyself with library.logic.peers.me');

						describe('when peer.rpc.updateMyself fails', () => {
							it('should call __private.removePeer');

							it(
								'should call __private.removePeer with {peer: peer, code: "ECOMMUNICATION"}'
							);
						});

						describe('when peer.rpc.updateMyself succeeds', () => {
							it('should call library.logger.debug');

							it(
								'should call __private.removePeer with "Peer notified correctly after update:" + peer.string'
							);
						});
					});

					describe('when async.each succeeds', () => {
						it('should call __private.broadcaster.broadcast');

						it(
							'should call __private.broadcaster.broadcast with {limit: constants.maxPeers, broadhash: modules.system.getBroadhash()}'
						);

						it(
							'should call __private.broadcaster.broadcast with {api: "postBlock", data: {block: block}, immediate: true}'
						);
					});
				});
			});

			it('should call library.network.io.sockets.emit');

			it('should call library.network.io.sockets.emit with "blocks/change"');

			it('should call library.network.io.sockets.emit with block');
		});

		describe('shared', () => {
			describe('blocksCommon', () => {
				describe('when query is undefined', () => {
					it('should set query = {}');
				});

				it('should call library.schema.validate');

				it('should call library.schema.validate with query');

				it('should call library.schema.validate with schema.commonBlock');

				describe('when library.schema.validate fails', () => {
					it('should set err = err[0].message + ": " + err[0].path');

					it('should call library.logger.debug');

					it(
						'should call library.logger.debug with "Common block request validation failed"'
					);

					it(
						'should call library.logger.debug with {err: err.toString(), req: query}'
					);

					it('should call callback with error');
				});

				describe('when library.schema.validate succeeds', () => {
					describe('escapedIds', () => {
						it('should remove quotes from query.ids');

						it('should separate ids from query.ids by comma');

						it('should remove any non-numeric values from query.ids');
					});

					describe('when escapedIds.length = 0', () => {
						it('should call library.logger.debug');

						it(
							'should call library.logger.debug with "Common block request validation failed"'
						);

						it(
							'should call library.logger.debug with {err: "ESCAPE", req: query.ids}'
						);

						it('should call __private.removePeer');

						it(
							'should call __private.removePeer with {peer: query.peer, code: "ECOMMON"}'
						);

						it('should call callback with error = "Invalid block id sequence"');
					});

					it('should call library.db.query');

					it('should call library.db.query with sql.getCommonBlock');

					it('should call library.db.query with escapedIds');

					describe('when library.db.query fails', () => {
						it('should call library.logger.error with error stack');

						it(
							'should call callback with error = "Failed to get common block"'
						);
					});

					describe('when library.db.query succeeds', () => {
						it('should call callback with error = null');

						it(
							'should call callback with result  = { success: true, common: rows[0] || null }'
						);
					});
				});
			});

			describe('blocks', () => {
				describe('when query is undefined', () => {
					it('should set query = {}');
				});

				it('should call modules.blocks.utils.loadBlocksData');

				it(
					'should call modules.blocks.utils.loadBlocksData with { limit: 34,lastId: query.lastBlockId }'
				);

				describe('when modules.blocks.utils.loadBlocksData fails', () => {
					it('should call callback with error = null');

					it('should call callback with result = { blocks: [] }');
				});

				describe('when modules.blocks.utils.loadBlocksData fails', () => {
					it('should call callback with error = null');

					it('should call callback with result = { blocks: data }');
				});
			});

			describe('postBlock', () => {
				describe('when query is undefined', () => {
					it('should set query = {}');
				});

				describe('when it throws', () => {
					it('should call library.logger.debug');

					it(
						'should call library.logger.debug with "Block normalization failed"'
					);

					it(
						'should call library.logger.debug with {err: e.toString(), module: "transport", block: query.block }'
					);

					it('should call __private.removePeer');

					it(
						'should call __private.removePeer with {peer: query.peer, code: "EBLOCK"}'
					);

					it('should call callback with error = e.toString()');
				});

				describe('when it does not throw', () => {
					describe('when query.block is defined', () => {
						it('should call bson.deserialize');

						it('should call bson.deserialize with Buffer.from(query.block)');

						describe('block', () => {
							it('should call modules.blocks.verify.addBlockProperties');

							it(
								'should call modules.blocks.verify.addBlockProperties with query.block'
							);
						});
					});

					it('should call library.logic.block.objectNormalize');
				});

				it('should call library.bus.message');

				it('should call library.bus.message with "receiveBlock"');

				it('should call library.bus.message with block');

				it('should call callback with error = null');

				it(
					'should call callback with result = {success: true, blockId: block.id}'
				);
			});

			describe('list', () => {
				describe('when req is undefined', () => {
					it('should set req = {}');
				});

				describe('peersFinder', () => {
					describe('when req.query is undefined', () => {
						it('should set peerFinder = modules.peers.list');
					});

					describe('when req.query is defined', () => {
						it('should set peerFinder = modules.peers.shared.getPeers');
					});
				});

				it('should call peersFinder');

				it(
					'should call peersFinder with Object.assign({}, {limit: constants.maxPeers}, req.query)'
				);

				describe('when peersFinder fails', () => {
					it('should set peers to []');
				});

				it('should return callback with error = null');

				it(
					'should return callback with result = {success: !err, peers: peers}'
				);
			});

			describe('height', () => {
				it('should call callback with error = null');

				it(
					'should call callback with result = {success: true, height: modules.system.getHeight()}'
				);
			});

			describe('status', () => {
				it('should call callback with error = null');

				it(
					'should call callback with result = {success: true, height: modules.system.getHeight(), broadhash: modules.system.getBroadhash(), nonce: modules.system.getNonce()}'
				);
			});

			describe('postSignatures', () => {
				describe('when query.signatures is defined', () => {
					it('should call __private.receiveSignatures');

					it('should call __private.receiveSignatures with query');

					describe('when __private.receiveSignatures fails', () => {
						it('should call callback with error = null');

						it(
							'should call callback with result = {success: false, message: err}'
						);
					});

					describe('when __private.receiveSignatures succeeds', () => {
						it('should call callback with error = null');

						it('should call callback with result = {success: true}');
					});
				});

				describe('when query.signatures is undefined', () => {
					it('should call __private.receiveSignature');

					it('should call __private.receiveSignature with query.signature');

					describe('when __private.receiveSignature fails', () => {
						it('should call callback with error = null');

						it(
							'should call callback with result = {success: false, message: err}'
						);
					});

					describe('when __private.receiveSignature succeeds', () => {
						it('should call callback with error = null');

						it('should call callback with result = {success: true}');
					});
				});
			});

			describe('getSignatures', () => {
				it('should call modules.transactions.getMultisignatureTransactionList');

				it(
					'should call modules.transactions.getMultisignatureTransactionList with true'
				);

				it(
					'should call modules.transactions.getMultisignatureTransactionList with constants.maxSharedTxs'
				);

				describe('for every transaction', () => {
					describe('when trs.signatures are defined', () => {
						describe('and trs.signatures.length is defined', () => {
							describe('signature', () => {
								it('should assign transaction: trs.id');

								it('should assign signatures: trs.signatures');
							});
						});
					});
				});

				it('should call callback with error = null');

				it(
					'should call callback with result = {success: true, signatures: signatures}'
				);
			});

			describe('getTransactions', () => {
				it('should call modules.transactions.getMergedTransactionList');

				it(
					'should call modules.transactions.getMergedTransactionList with true'
				);

				it(
					'should call modules.transactions.getMergedTransactionList with constants.maxSharedTxs'
				);

				it('should call callback with error = null');

				it(
					'should call callback with result = {success: true, transactions: transactions}'
				);
			});

			describe('postTransactions', () => {
				describe('when query.transactions is defined', () => {
					it('should call __private.receiveTransactions');

					it('should call __private.receiveTransactions with query');

					it('should call __private.receiveTransactions with query.peer');

					it(
						'should call __private.receiveTransactions with query.extraLogMessage'
					);

					describe('when __private.receiveTransactions fails', () => {
						it('should call callback with error = null');

						it(
							'should call callback with result = {success: false, message: err}'
						);
					});

					describe('when __private.receiveTransactions succeeds', () => {
						it('should call callback with error = null');

						it('should call callback with result = {success: true}');
					});
				});

				describe('when query.transactions is undefined', () => {
					it('should call __private.receiveTransaction');

					it('should call __private.receiveTransaction with query.transaction');

					it('should call __private.receiveTransaction with query.peer');

					it(
						'should call __private.receiveTransaction with query.extraLogMessage'
					);

					describe('when __private.receiveTransaction fails', () => {
						it('should call callback with error = null');

						it(
							'should call callback with result = {success: false,  message: err}'
						);
					});

					describe('when __private.receiveTransaction succeeds', () => {
						it('should call callback with error = null');

						it(
							'should call callback with result = {success: true, transactionId: id}'
						);
					});
				});
			});
		});
	});

	describe('__private.checkInternalAccess', () => {
		it('should call library.schema.validate');

		it('should call library.schema.validate with query');

		it('should call library.schema.validate with schema.internalAccess');

		describe('when library.schema.validate fails', () => {
			it('should call callback with error = err[0].message');
		});

		describe('when library.schema.validate succeeds', () => {
			describe('when query.authKey != wsRPC.getServerAuthKey()', () => {
				it(
					'should call callback with error = "Unable to access internal function - Incorrect authKey"'
				);
			});

			it('should call callback with error = null');

			it('should call callback with result = undefined');
		});
	});

	describe('Transport.prototype.internal', () => {
		describe('updatePeer', () => {
			it('should call __private.checkInternalAccess');

			it('should call __private.checkInternalAccess with query');

			describe('when __private.checkInternalAccess fails', () => {
				it('should call callback wit error = err');
			});

			describe('when __private.checkInternalAccess succeeds', () => {
				describe('updateResult', () => {
					describe('when query.updateType = 0 (insert)', () => {
						it('should call modules.peers.update');

						it('should call modules.peers.update with query.peer');
					});

					describe('when query.updateType = 1 (remove)', () => {
						it('should call modules.peers.remove');

						it('should call modules.peers.remove with query.peer');
					});
				});

				describe('when updateResult = false', () => {
					it(
						'should call callback with error = new PeerUpdateError(updateResult, failureCodes.errorMessages[updateResult])'
					);
				});

				describe('when updateResult = true', () => {
					it('should call callback with error = null');
				});
			});
		});
	});
});
