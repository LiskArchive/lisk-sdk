/* eslint-disable mocha/no-pending-tests, mocha/no-skipped-tests */
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
var randomstring = require('randomstring');
var Bignum = require('../../../helpers/bignum.js');
var swaggerHelper = require('../../../helpers/swagger');
var WSServer = require('../../common/ws/server_master');
var generateRandomActivePeer = require('../../fixtures/peers')
	.generateRandomActivePeer;
var Block = require('../../fixtures/blocks').Block;
var Rules = require('../../../api/ws/workers/rules');

var TransportModule = rewire('../../../modules/transport.js');

const { MAX_PEERS, MAX_SHARED_TRANSACTIONS } = __testContext.config.constants;
var expect = chai.expect;

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
	var peerMock;
	var definitions;
	var wsRPC;
	var transaction;
	var block;
	var peersList;
	var blocksList;
	var transactionsList;
	var multisignatureTransactionsList;
	var blockMock;
	var error;

	const SAMPLE_SIGNATURE_1 = {
		transactionId: '222675625422353767',
		publicKey:
			'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
		signature:
			'32636139613731343366633732316664633534306665663839336232376538643634386432323838656661363165353632363465646630316132633233303739',
	};

	const validNonce = randomstring.generate(16);

	const SAMPLE_SIGNATURE_2 = {
		transactionId: '222675625422353768',
		publicKey:
			'3ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23080',
		signature:
			'61383939393932343233383933613237653864363438643232383865666136316535363236346564663031613263323330373784192003750382840553137595',
	};

	const SAMPLE_AUTH_KEY = 'testkey123';

	beforeEach(done => {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

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

		blockMock = Block();

		transactionsList = [
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
				signature:
					'1231d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c567',
			},
		];

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
			// eslint-disable-next-line object-shorthand
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
					active: true,
					broadcastInterval: 10000,
					releaseLimit: 10,
				},
			},
		};

		peerMock = {
			nonce: 'sYHEDBKcScaAAAYg',
		};

		swaggerHelper.getResolvedSwaggerSpec().then(resolvedSpec => {
			definitions = resolvedSpec.definitions;
			defaultScope.swagger = {
				definitions,
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
				return expect(transportSelf).to.equal(localTransportInstance);
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
					logic: {
						transaction: {
							objectNormalize: sinonSandbox.stub(),
						},
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

				wsRPC = {
					getServerAuthKey: sinonSandbox.stub().returns(SAMPLE_AUTH_KEY),
				};

				restoreRewiredDeps = TransportModule.__set__({
					library,
					modules,
					definitions,
					wsRPC,
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
			describe('when options.nonce is undefined', () => {
				var result;

				beforeEach(done => {
					result = __private.removePeer({}, 'Custom peer remove message');
					done();
				});

				it('should call library.logger.debug with "Cannot remove peer without nonce"', () => {
					expect(library.logger.debug.called).to.be.true;
					return expect(
						library.logger.debug.calledWith('Cannot remove peer without nonce')
					).to.be.true;
				});

				it('should return false', () => {
					return expect(result).to.be.false;
				});
			});

			describe('when options.nonce is defined', () => {
				var removeSpy;
				var validNonce;

				beforeEach(done => {
					removeSpy = sinonSandbox.spy();

					modules.peers = {
						remove: removeSpy,
					};

					library.logic = {
						peers: {
							peersManager: {
								getByNonce: sinonSandbox.stub().returns(peerMock),
							},
						},
					};

					validNonce = randomstring.generate(16);

					__private.removePeer(
						{
							nonce: validNonce,
						},
						'Custom peer remove message'
					);
					done();
				});

				it('should call library.logger.debug', () => {
					return expect(library.logger.debug.called).to.be.true;
				});

				it('should call modules.peers.remove with options.peer', () => {
					return expect(removeSpy.calledWith(peerMock)).to.be.true;
				});
			});
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

					it('should call __private.receiveSignature with signature', () => {
						expect(__private.receiveSignature.calledTwice).to.be.true;
						expect(__private.receiveSignature.calledWith(SAMPLE_SIGNATURE_1)).to
							.be.true;
						return expect(
							__private.receiveSignature.calledWith(SAMPLE_SIGNATURE_2)
						).to.be.true;
					});
				});

				describe('when __private.receiveSignature fails', () => {
					var receiveSignatureError;

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

					it('should call library.logger.debug with err and signature', () => {
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
					processSignature: sinonSandbox.stub().callsArg(1),
				};

				done();
			});

			describe('when library.schema.validate succeeds', () => {
				describe('when modules.multisignatures.processSignature succeeds', () => {
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
						return expect(
							library.schema.validate.calledWith(SAMPLE_SIGNATURE_1)
						).to.be.true;
					});

					it('should call modules.multisignatures.processSignature with signature', () => {
						expect(error).to.equal(undefined);
						return expect(
							modules.multisignatures.processSignature.calledWith(
								SAMPLE_SIGNATURE_1
							)
						).to.be.true;
					});

					it('should call callback with error = undefined', () => {
						return expect(error).to.equal(undefined);
					});
				});

				describe('when modules.multisignatures.processSignature fails', () => {
					var processSignatureError;

					beforeEach(done => {
						processSignatureError = new Error('Transaction not found');
						modules.multisignatures.processSignature = sinonSandbox
							.stub()
							.callsArgWith(1, processSignatureError);

						__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
							error = err;
							done();
						});
					});

					it('should call callback with error', () => {
						return expect(error).to.equal(
							`Error processing signature: ${processSignatureError.message}`
						);
					});
				});
			});

			describe('when library.schema.validate fails', () => {
				var validateErr;

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

				it('should call callback with error = "Invalid signature body"', () => {
					return expect(error).to.equal(
						`Invalid signature body ${validateErr.message}`
					);
				});
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
				modules.peers = {
					remove: sinonSandbox.stub().returns(true),
				};

				__private.receiveTransaction = sinonSandbox.stub().callsArg(3);

				done();
			});

			describe('when transactions argument is undefined', () => {
				beforeEach(done => {
					__private.receiveTransactions(undefined, peerMock, '');
					done();
				});

				// If a single transaction within the batch fails, it is not going to
				// send back an error.
				it('should should not call __private.receiveTransaction', () => {
					return expect(__private.receiveTransaction.notCalled).to.be.true;
				});
			});

			describe('for every transaction in transactions', () => {
				describe('when transaction is defined', () => {
					describe('when call __private.receiveTransaction succeeds', () => {
						beforeEach(done => {
							__private.receiveTransactions(
								transactionsList,
								peerMock,
								'This is a log message'
							);
							done();
						});

						it('should set transaction.bundled = true', () => {
							return expect(transactionsList[0])
								.to.have.property('bundled')
								.which.equals(true);
						});

						it('should call __private.receiveTransaction with transaction with transaction, peer and extraLogMessage arguments', () => {
							return expect(
								__private.receiveTransaction.calledWith(
									transactionsList[0],
									peerMock,
									'This is a log message'
								)
							).to.be.true;
						});
					});

					describe('when call __private.receiveTransaction fails', () => {
						var receiveTransactionError;

						beforeEach(done => {
							receiveTransactionError = 'Invalid transaction body - ...';
							__private.receiveTransaction = sinonSandbox
								.stub()
								.callsArgWith(3, receiveTransactionError);

							__private.receiveTransactions(
								transactionsList,
								peerMock,
								'This is a log message'
							);
							done();
						});

						it('should call library.logger.debug with error and transaction', () => {
							return expect(
								library.logger.debug.calledWith(
									receiveTransactionError,
									transactionsList[0]
								)
							).to.be.true;
						});
					});
				});
			});
		});

		describe('receiveTransaction', () => {
			var peerAddressString;

			beforeEach(done => {
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
				done();
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(done => {
					__private.receiveTransaction(
						transaction,
						validNonce,
						'This is a log message',
						() => {
							done();
						}
					);
				});

				it('should call library.logic.transaction.objectNormalize with transaction', () => {
					return expect(
						library.logic.transaction.objectNormalize.calledWith(transaction)
					).to.be.true;
				});

				it('should call library.balancesSequence.add', () => {
					return expect(library.balancesSequence.add.called).to.be.true;
				});

				it('should call modules.transactions.processUnconfirmedTransaction with transaction and true as arguments', () => {
					return expect(
						modules.transactions.processUnconfirmedTransaction.calledWith(
							transaction,
							true
						)
					).to.be.true;
				});
			});

			describe('when library.logic.transaction.objectNormalize throws', () => {
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
						validNonce,
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
						transaction,
					};
					return expect(
						library.logger.debug.calledWith(
							'Transaction normalization failed',
							errorDetails
						)
					).to.be.true;
				});

				it('should call __private.removePeer with peer details object', () => {
					var peerDetails = { nonce: validNonce, code: 'ETRANSACTION' };
					return expect(
						__private.removePeer.calledWith(peerDetails, extraLogMessage)
					).to.be.true;
				});

				it('should call callback with error = "Invalid transaction body"', () => {
					return expect(error).to.equal(
						`Invalid transaction body - ${objectNormalizeError}`
					);
				});
			});

			describe('when nonce is undefined', () => {
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
					return expect(
						library.logger.debug.calledWith(
							`Received transaction ${transaction.id} from public client`
						)
					).to.be.true;
				});
			});

			describe('when nonce is defined', () => {
				beforeEach(done => {
					__private.receiveTransaction(
						transaction,
						validNonce,
						'This is a log message',
						() => {
							done();
						}
					);
				});

				it('should call library.logger.debug with "Received transaction " + transaction.id + " from peer ..."', () => {
					return expect(
						library.logger.debug.calledWith(
							`Received transaction ${
								transaction.id
							} from peer ${peerAddressString}`
						)
					).to.be.true;
				});

				it('should call library.logic.peers.peersManager.getAddress with peer.nonce', () => {
					return expect(
						library.logic.peers.peersManager.getAddress.calledWith(validNonce)
					).to.be.true;
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction fails', () => {
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
						peerMock,
						'This is a log message',
						err => {
							error = err;
							done();
						}
					);
				});

				it('should call library.logger.debug with "Transaction ${transaction.id}" and error string', () => {
					return expect(
						library.logger.debug.calledWith(
							`Transaction ${transaction.id}`,
							processUnconfirmedTransactionError
						)
					).to.be.true;
				});

				describe('when transaction is defined', () => {
					it('should call library.logger.debug with "Transaction" and transaction as arguments', () => {
						return expect(
							library.logger.debug.calledWith('Transaction', transaction)
						).to.be.true;
					});
				});

				it('should call callback with err.toString()', () => {
					return expect(error).to.equal(processUnconfirmedTransactionError);
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', () => {
				var result;

				beforeEach(done => {
					__private.receiveTransaction(
						transaction,
						peerMock,
						'This is a log message',
						(err, res) => {
							error = err;
							result = res;
							done();
						}
					);
				});

				it('should call callback with error = null', () => {
					return expect(error).to.equal(null);
				});

				it('should call callback with result = transaction.id', () => {
					return expect(result).to.equal(transaction.id);
				});
			});
		});

		describe('__private.checkInternalAccess', () => {
			var query;
			var result;

			beforeEach(done => {
				query = {
					authKey: SAMPLE_AUTH_KEY,
				};
				__private.checkInternalAccess(query, (err, res) => {
					error = err;
					result = res;
					done();
				});
			});

			it('should call library.schema.validate with query and definitions.WSAccessObject', () => {
				return expect(
					library.schema.validate.calledWith(query, definitions.WSAccessObject)
				).to.be.true;
			});

			describe('when library.schema.validate succeeds', () => {
				describe('when query.authKey != wsRPC.getServerAuthKey()', () => {
					beforeEach(done => {
						query = {
							authKey: SAMPLE_AUTH_KEY,
						};
						wsRPC.getServerAuthKey = sinonSandbox
							.stub()
							.returns('differentauthkey789');
						__private.checkInternalAccess(query, err => {
							error = err;
							done();
						});
					});

					it('should call callback with error = "Unable to access internal function - Incorrect authKey"', () => {
						return expect(error).to.equal(
							'Unable to access internal function - Incorrect authKey'
						);
					});
				});

				it('should call callback with error = null', () => {
					return expect(error).to.equal(null);
				});

				it('should call callback with result = undefined', () => {
					return expect(result).to.equal(undefined);
				});
			});

			describe('when library.schema.validate fails', () => {
				var validateErr;

				beforeEach(done => {
					validateErr = new Error('Query did not match schema');
					validateErr.code = 'INVALID_FORMAT';

					query = {
						authKey: SAMPLE_AUTH_KEY,
					};
					library.schema.validate = sinonSandbox
						.stub()
						.callsArgWith(2, [validateErr]);
					__private.checkInternalAccess(query, err => {
						error = err;
						done();
					});
				});

				it('should call callback with error = err[0].message', () => {
					return expect(error).to.equal(validateErr.message);
				});
			});
		});
	});

	describe('Transport', () => {
		var restoreRewiredTransportDeps;

		beforeEach(done => {
			peersList = [];
			for (var i = 0; i < 10; i++) {
				var peer = generateRandomActivePeer();
				peer.rpc = {
					updateMyself: sinonSandbox.stub().callsArg(1),
				};
				peersList.push(peer);
			}

			blocksList = [];
			for (var j = 0; j < 10; j++) {
				var block = Block();
				blocksList.push(block);
			}

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
						broadcasts: {
							active: true,
						},
					},
					network: {
						io: {
							sockets: {
								emit: sinonSandbox.stub(),
							},
						},
					},
					logic: {
						peers: {
							me: sinonSandbox.stub().returns(WSServer.generatePeerHeaders()),
							listRandomConnected: sinonSandbox.stub().returns(peersList),
						},
						block: {
							objectNormalize: sinonSandbox.stub().returns(Block()),
						},
					},
					db: {
						blocks: {
							getBlockForTransport: sinonSandbox.stub().resolves(blocksList),
						},
					},
				};

				modules = {
					peers: {
						calculateConsensus: sinonSandbox.stub().returns(100),
						list: sinonSandbox.stub().callsArgWith(1, null, peersList),
						update: sinonSandbox.stub().returns(true),
						remove: sinonSandbox.stub().returns(true),
					},
					system: {
						update: sinonSandbox.stub().callsArg(0),
						getBroadhash: sinonSandbox
							.stub()
							.returns(
								'81a410c4ff35e6d643d30e42a27a222dbbfc66f1e62c32e6a91dd3438defb70b'
							),
					},
					loader: {
						syncing: sinonSandbox.stub().returns(false),
					},
					blocks: {
						utils: {
							loadBlocksData: sinonSandbox
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
					removePeer: sinonSandbox.stub(),
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

		describe('poorConsensus', () => {
			var isPoorConsensusResult;

			describe('when library.config.forging.force is true', () => {
				beforeEach(done => {
					library.config.forging.force = true;
					isPoorConsensusResult = transportInstance.poorConsensus();
					done();
				});

				it('should return false', () => {
					return expect(isPoorConsensusResult).to.be.false;
				});
			});

			describe('when library.config.forging.force is false', () => {
				beforeEach(done => {
					library.config.forging.force = false;
					done();
				});

				describe('when modules.peers.calculateConsensus() < MIN_BROADHASH_CONSENSUS', () => {
					beforeEach(done => {
						modules.peers.calculateConsensus = sinonSandbox.stub().returns(50);
						isPoorConsensusResult = transportInstance.poorConsensus();
						done();
					});

					it('should return true', () => {
						return expect(isPoorConsensusResult).to.be.true;
					});
				});

				describe('when modules.peers.calculateConsensus() >= MIN_BROADHASH_CONSENSUS', () => {
					beforeEach(done => {
						modules.peers.calculateConsensus = sinonSandbox.stub().returns(51);
						isPoorConsensusResult = transportInstance.poorConsensus();
						done();
					});

					it('should return false', () => {
						return expect(isPoorConsensusResult).to.be.false;
					});
				});
			});
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
				var modulesObject;

				beforeEach(done => {
					modulesObject = TransportModule.__get__('modules');
					done();
				});

				it('should assign blocks, dapps, loader, multisignatures, peers, system and transactions properties', () => {
					expect(modulesObject).to.have.property('blocks');
					expect(modulesObject).to.have.property('dapps');
					expect(modulesObject).to.have.property('loader');
					expect(modulesObject).to.have.property('multisignatures');
					expect(modulesObject).to.have.property('peers');
					expect(modulesObject).to.have.property('system');
					return expect(modulesObject).to.have.property('transactions');
				});
			});

			describe('definitions', () => {
				var definitionsObject;

				beforeEach(done => {
					definitionsObject = TransportModule.__get__('definitions');
					done();
				});

				it('should assign definitions object', () => {
					return expect(definitionsObject).to.equal(
						defaultScope.swagger.definitions
					);
				});
			});

			it('should call __private.broadcaster.bind with scope.peers, scope.transport and scope.transactions as arguments', () => {
				return expect(
					__private.broadcaster.bind.calledWith(
						defaultScope.peers,
						defaultScope.transport,
						defaultScope.transactions
					)
				).to.be.true;
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

				it('should call __private.broadcaster.maxRelays with signature', () => {
					expect(__private.broadcaster.maxRelays.calledOnce).to.be.true;
					return expect(
						__private.broadcaster.maxRelays.calledWith(SAMPLE_SIGNATURE_1)
					).to.be.true;
				});

				describe('when result of __private.broadcaster.maxRelays is false', () => {
					it('should call __private.broadcaster.enqueue with {} and {api: "postSignatures", data: {signature: signature}} as arguments', () => {
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

					it('should call library.network.io.sockets.emit with "signature/change" and signature', () => {
						expect(library.network.io.sockets.emit.calledOnce).to.be.true;
						return expect(
							library.network.io.sockets.emit.calledWith(
								'signature/change',
								SAMPLE_SIGNATURE_1
							)
						).to.be.true;
					});
				});
			});
		});

		describe('onUnconfirmedTransaction', () => {
			beforeEach(done => {
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
				__private.broadcaster = {
					maxRelays: sinonSandbox.stub().returns(true),
					enqueue: sinonSandbox.stub(),
				};
				transportInstance.onUnconfirmedTransaction(transaction, true);
				done();
			});

			describe('when broadcast is defined', () => {
				it('should call __private.broadcaster.maxRelays with transaction', () => {
					expect(__private.broadcaster.maxRelays.calledOnce).to.be.true;
					return expect(__private.broadcaster.maxRelays.calledWith(transaction))
						.to.be.true;
				});

				describe('when result of __private.broadcaster.maxRelays is false', () => {
					beforeEach(done => {
						__private.broadcaster = {
							maxRelays: sinonSandbox.stub().returns(false),
							enqueue: sinonSandbox.stub(),
						};
						transportInstance.onUnconfirmedTransaction(transaction, true);
						done();
					});

					it('should call __private.broadcaster.enqueue with {} and {api: "postTransactions", data: {transaction}}', () => {
						expect(__private.broadcaster.enqueue.calledOnce).to.be.true;
						return expect(
							__private.broadcaster.enqueue.calledWith(
								{},
								{
									api: 'postTransactions',
									data: { transaction },
								}
							)
						).to.be.true;
					});

					it('should call library.network.io.sockets.emit with "transactions/change" and transaction as arguments', () => {
						expect(library.network.io.sockets.emit.calledOnce).to.be.true;
						return expect(
							library.network.io.sockets.emit.calledWith(
								'transactions/change',
								transaction
							)
						).to.be.true;
					});
				});
			});
		});

		describe('broadcastHeaders', () => {
			beforeEach(done => {
				transportInstance.broadcastHeaders(done);
			});

			it('should call ibrary.logic.peers.listRandomConnected with {limit: MAX_PEERS}', () => {
				expect(library.logic.peers.listRandomConnected.calledOnce).to.be.true;
				return expect(
					library.logic.peers.listRandomConnected.calledWith({
						limit: MAX_PEERS,
					})
				).to.be.true;
			});

			describe('when peers.length = 0', () => {
				beforeEach(done => {
					library.logic.peers.listRandomConnected = sinonSandbox
						.stub()
						.returns([]);
					transportInstance.broadcastHeaders(done);
				});

				it('should call library.logger.debug with proper message', () => {
					return expect(
						library.logger.debug.calledWith(
							'Transport->broadcastHeaders: No peers found'
						)
					).to.be.true;
				});
			});

			describe('for every filtered peer in peers', () => {
				it('should call peer.rpc.updateMyself with the result of library.logic.peers.me()', () => {
					return peersList.forEach(peer => {
						expect(peer.rpc.updateMyself.calledOnce).to.be.true;
						expect(peer.rpc.updateMyself.calledWith(library.logic.peers.me()))
							.to.be.true;
					});
				});

				describe('when peer.rpc.updateMyself fails', () => {
					const error = 'RPC failure';

					beforeEach(done => {
						peerMock = generateRandomActivePeer();
						peerMock.rpc = {
							updateMyself: sinonSandbox.stub().callsArgWith(1, error),
						};
						library.logic.peers.listRandomConnected = sinonSandbox
							.stub()
							.returns([peerMock]);
						__private.removePeer = sinonSandbox.stub();
						transportInstance.broadcastHeaders(done);
					});

					it('should call library.logger.debug with proper message', () => {
						return expect(
							library.logger.debug.calledWith(
								'Transport->broadcastHeaders: Failed to notify peer about self',
								{ peer: peerMock.string, err: error }
							)
						).to.be.true;
					});
				});

				describe('when peer.rpc.updateMyself succeeds', () => {
					beforeEach(done => {
						peerMock = generateRandomActivePeer();
						peerMock.rpc = {
							updateMyself: sinonSandbox.stub().callsArg(1),
						};
						modules.peers.list = sinonSandbox
							.stub()
							.callsArgWith(1, null, [peerMock]);
						__private.removePeer = sinonSandbox.stub();
						transportInstance.broadcastHeaders(done);
					});

					it('should call library.logger.debug with proper message', () => {
						return expect(
							library.logger.debug.calledWith(
								'Transport->broadcastHeaders: Successfully notified peer about self',
								{ peer: peerMock.string }
							)
						).to.be.true;
					});
				});
			});
		});

		describe('onBroadcastBlock', () => {
			describe('when broadcast is defined', () => {
				beforeEach(done => {
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
					transportInstance.onBroadcastBlock(block, true);
					done();
				});

				it('should call __private.broadcaster.maxRelays with block', () => {
					expect(__private.broadcaster.maxRelays.calledOnce).to.be.true;
					return expect(__private.broadcaster.maxRelays.calledWith(block)).to.be
						.true;
				});

				describe('when __private.broadcaster.maxRelays returns true', () => {
					beforeEach(done => {
						__private.broadcaster.maxRelays = sinonSandbox.stub().returns(true);
						transportInstance.onBroadcastBlock(block, true);
						done();
					});

					it('should call library.logger.debug with proper error message', () => {
						return expect(
							library.logger.debug.calledWith(
								'Transport->onBroadcastBlock: Aborted - max block relays exhausted'
							)
						).to.be.true;
					});
				});

				describe('when modules.loader.syncing = true', () => {
					beforeEach(done => {
						modules.loader.syncing = sinonSandbox.stub().returns(true);
						transportInstance.onBroadcastBlock(block, true);
						done();
					});

					it('should call library.logger.debug with proper error message', () => {
						return expect(
							library.logger.debug.calledWith(
								'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress'
							)
						).to.be.true;
					});
				});

				it('should call __private.broadcaster.broadcast with {broadhash: modules.system.getBroadhash()}', () => {
					return expect(
						__private.broadcaster.broadcast.calledWith(
							{
								broadhash:
									'81a410c4ff35e6d643d30e42a27a222dbbfc66f1e62c32e6a91dd3438defb70b',
							},
							{ api: 'postBlock', data: { block }, immediate: true }
						)
					).to.be.true;
				});

				it('should call library.network.io.sockets.emit with "blocks/change" and block', () => {
					return expect(
						library.network.io.sockets.emit.calledWith('blocks/change', block)
					).to.be.true;
				});
			});
		});

		describe('Transport.prototype.shared', () => {
			var result;
			var query;
			var req;

			describe('blocksCommon', () => {
				var validateErr;

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

					it('should send back error due to schema validation failure', () => {
						return expect(error).to.equal(`${validateErr.message}: undefined`);
					});
				});

				describe('when query is specified', () => {
					beforeEach(done => {
						query = { ids: '"1","2","3"' };
						transportInstance.shared.blocksCommon(query, err => {
							error = err;
							done();
						});
					});

					it('should call library.schema.validate with query and schema.commonBlock', () => {
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

						it('should call library.logger.debug with "Common block request validation failed" and {err: err.toString(), req: query}', () => {
							expect(library.logger.debug.calledOnce).to.be.true;
							return expect(
								library.logger.debug.calledWith(
									'Common block request validation failed',
									{ err: `${validateErr.message}: undefined`, req: query }
								)
							).to.be.true;
						});

						it('should call callback with error', () => {
							return expect(error).to.equal(
								`${validateErr.message}: undefined`
							);
						});
					});

					describe('when library.schema.validate succeeds', () => {
						describe('when escapedIds.length = 0', () => {
							beforeEach(done => {
								// All ids will be filtered out because they are non-numeric.
								query = { ids: '"abc","def","ghi"', peer: peerMock };
								transportInstance.shared.blocksCommon(query, err => {
									error = err;
									done();
								});
							});

							it('should call library.logger.debug with "Common block request validation failed" and {err: "ESCAPE", req: query.ids}', () => {
								expect(library.logger.debug.calledOnce).to.be.true;
								return expect(
									library.logger.debug.calledWith(
										'Common block request validation failed',
										{ err: 'ESCAPE', req: query.ids }
									)
								).to.be.true;
							});

							it('should call callback with error = "Invalid block id sequence"', () => {
								return expect(error).to.be.equal('Invalid block id sequence');
							});
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

					it('should send back empty blocks', () => {
						expect(error).to.equal(null);
						return expect(result)
							.to.have.property('blocks')
							.which.is.an('array').that.is.empty;
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

					it('should call modules.blocks.utils.loadBlocksData with { limit: 34, lastId: query.lastBlockId }', () => {
						return expect(
							modules.blocks.utils.loadBlocksData.calledWith({
								limit: 34,
								lastId: query.lastBlockId,
							})
						).to.be.true;
					});

					describe('when modules.blocks.utils.loadBlocksData fails', () => {
						var loadBlockFailed;

						beforeEach(done => {
							loadBlockFailed = new Error('Failed to load blocks...');
							modules.blocks.utils.loadBlocksData = sinonSandbox
								.stub()
								.callsArgWith(1, loadBlockFailed);

							transportInstance.shared.blocks(query, (err, res) => {
								error = err;
								result = res;
								done();
							});
						});

						it('should call callback with error = null', () => {
							return expect(error).to.be.equal(null);
						});

						it('should call callback with result = { blocks: [] }', () => {
							return expect(result)
								.to.have.property('blocks')
								.which.is.an('array').that.is.empty;
						});
					});
				});
			});

			describe('postBlock', () => {
				var query;

				beforeEach(done => {
					query = {
						block: blockMock,
						nonce: validNonce,
					};
					library.bus = {
						message: sinonSandbox.stub(),
					};
					done();
				});

				describe('when library.config.broadcasts.active option is false', () => {
					beforeEach(done => {
						library.config.broadcasts.active = false;
						transportInstance.shared.postBlock(query);
						done();
					});

					it('should call library.logger.debug', () => {
						return expect(
							library.logger.debug.calledWith(
								'Receiving blocks disabled by user through config.json'
							)
						).to.be.true;
					});

					it('should not call library.schema.validate; function should return before', () => {
						return expect(library.schema.validate.called).to.be.false;
					});
				});

				describe('when query is specified', () => {
					beforeEach(done => {
						transportInstance.shared.postBlock(query);
						done();
					});

					describe('when it throws', () => {
						var blockValidationError = 'Failed to validate block schema';

						beforeEach(done => {
							library.logic.block.objectNormalize = sinonSandbox
								.stub()
								.throws(blockValidationError);
							transportInstance.shared.postBlock(query);
							done();
						});

						it('should call library.logger.debug with "Block normalization failed" and {err: error, module: "transport", block: query.block }', () => {
							return expect(
								library.logger.debug.calledWith('Block normalization failed', {
									err: blockValidationError.toString(),
									module: 'transport',
									block: blockMock,
								})
							).to.be.true;
						});

						it('should call __private.removePeer with {peer: query.peer, code: "EBLOCK"}', () => {
							return expect(
								__private.removePeer.calledWith({
									nonce: validNonce,
									code: 'EBLOCK',
								})
							).to.be.true;
						});
					});

					describe('when it does not throw', () => {
						beforeEach(done => {
							library.logic.block.objectNormalize = sinonSandbox
								.stub()
								.returns(blockMock);
							transportInstance.shared.postBlock(query);
							done();
						});

						describe('when query.block is defined', () => {
							it('should call modules.blocks.verify.addBlockProperties with query.block', () => {
								return expect(
									modules.blocks.verify.addBlockProperties.calledWith(
										query.block
									)
								).to.be.true;
							});
						});

						it('should call library.logic.block.objectNormalize with block', () => {
							return expect(
								library.logic.block.objectNormalize.calledWith(blockMock)
							).to.be.true;
						});

						it('should call library.bus.message with "receiveBlock" and block', () => {
							return expect(
								library.bus.message.calledWith('receiveBlock', blockMock)
							).to.be.true;
						});
					});
				});
			});

			describe('list', () => {
				describe('when req is undefined', () => {
					beforeEach(done => {
						req = undefined;
						modules.peers.list = sinonSandbox.stub().callsArgWith(1, null, []);
						transportInstance.shared.list(req, (err, res) => {
							error = err;
							result = res;
							done();
						});
					});

					it('should invoke callback with empty result', () => {
						expect(modules.peers.list.calledOnce).to.be.true;
						expect(modules.peers.list.calledWith({ limit: MAX_PEERS })).to.be
							.true;
						expect(error).to.equal(null);
						expect(result)
							.to.have.property('success')
							.which.is.equal(true);
						return expect(result)
							.to.have.property('peers')
							.which.is.an('array').that.is.empty;
					});
				});

				describe('when req is specified', () => {
					beforeEach(done => {
						req = {
							query: {
								limit: peersList.length,
							},
						};
						modules.peers.shared = {
							getPeers: sinonSandbox.stub().callsArgWith(1, null, peersList),
						};
						modules.peers.list = sinonSandbox
							.stub()
							.callsArgWith(1, null, peersList);
						transportInstance.shared.list(req, (err, res) => {
							error = err;
							result = res;
							done();
						});
					});

					it('should call the correct peersFinder function with the sanitized query as argument', () => {
						expect(error).to.equal(null);
						expect(
							modules.peers.shared.getPeers.calledWith({
								limit: peersList.length,
							})
						).to.be.true;
						return expect(modules.peers.list.called).to.be.false;
					});

					describe('when peersFinder fails', () => {
						var failedToFindPeerError = 'Failed to find peer ...';

						beforeEach(done => {
							req = {
								query: {
									limit: peersList.length,
								},
							};
							modules.peers.shared = {
								getPeers: sinonSandbox
									.stub()
									.callsArgWith(1, failedToFindPeerError),
							};
							modules.peers.list = sinonSandbox
								.stub()
								.callsArgWith(1, failedToFindPeerError);
							transportInstance.shared.list(req, (err, res) => {
								error = err;
								result = res;
								done();
							});
						});

						it('should invoke the callback with empty peers list and success set to false', () => {
							expect(error).to.equal(null);
							expect(result)
								.to.have.property('peers')
								.which.is.an('array').that.is.empty;
							expect(result)
								.to.have.property('success')
								.which.is.equal(false);
							expect(
								modules.peers.shared.getPeers.calledWith({
									limit: peersList.length,
								})
							).to.be.true;
							return expect(modules.peers.list.called).to.be.false;
						});
					});

					it('should return callback with error = null and result = {success: true, peers: peers}', () => {
						expect(error).to.be.equal(null);
						expect(result)
							.to.have.property('success')
							.which.equals(true);
						return expect(result)
							.to.have.property('peers')
							.which.is.an('array').that.is.not.empty;
					});
				});
			});

			describe('height', () => {
				var currentHeight;

				beforeEach(done => {
					currentHeight = 12345;
					req = {};
					modules.system.getHeight = sinonSandbox.stub().returns(currentHeight);
					transportInstance.shared.height(req, (err, res) => {
						error = err;
						result = res;
						done();
					});
				});

				it('should call callback with error = null', () => {
					return expect(error).to.be.equal(null);
				});

				it('should call callback with result = {success: true, height: currentHeight}', () => {
					expect(result)
						.to.have.property('success')
						.which.is.equal(true);
					return expect(result)
						.to.have.property('height')
						.which.is.equal(currentHeight);
				});
			});

			describe('status', () => {
				var headers;

				beforeEach(done => {
					headers = {
						height: 123,
						broadhash:
							'258974416d58533227c6a3da1b6333f0541b06c65b41e45cf31926847a3db1ea',
						nonce: 'sYHEDBKcScaAAAYg',
						httpPort: 8000,
						version: 'v0.8.0',
						os: 'debian',
					};
					req = {};
					modules.system.headers = sinonSandbox.stub().returns(headers);
					transportInstance.shared.status(req, (err, res) => {
						error = err;
						result = res;
						done();
					});
				});

				it('should call callback with error = null', () => {
					return expect(error).to.be.equal(null);
				});

				it('should call callback with a result containing status = true', () => {
					return expect(result)
						.to.have.property('success')
						.which.equals(true);
				});

				it('should call callback with a result containing height = 123', () => {
					return expect(result)
						.to.have.property('height')
						.which.equals(headers.height);
				});

				it('should call callback with a result containing broadhash = "258974416d58533227c6a3da1b6333f0541b06c65b41e45cf31926847a3db1ea"', () => {
					return expect(result)
						.to.have.property('broadhash')
						.which.equals(headers.broadhash);
				});

				it('should call callback with a result containing httpPort = 8000', () => {
					return expect(result)
						.to.have.property('httpPort')
						.which.equals(headers.httpPort);
				});

				it('should call callback with a result containing version = "v0.8.0"', () => {
					return expect(result)
						.to.have.property('version')
						.which.equals(headers.version);
				});

				it('should call callback with a result containing os = "debian"', () => {
					return expect(result)
						.to.have.property('os')
						.which.equals(headers.os);
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

				it('should call __private.receiveSignature with query.signature as argument', () => {
					return expect(__private.receiveSignature.calledWith(query.signature))
						.to.be.true;
				});

				describe('when __private.receiveSignature succeeds', () => {
					it('should invoke callback with object { success: true }', () => {
						expect(error).to.equal(null);
						return expect(result)
							.to.have.property('success')
							.which.is.equal(true);
					});
				});

				describe('when __private.receiveSignature fails', () => {
					var receiveSignatureError = 'Invalid signature body ...';

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

					it('should invoke callback with object { success: false, message: err }', () => {
						expect(error).to.equal(null);
						expect(result)
							.to.have.property('success')
							.which.is.equal(false);
						return expect(result)
							.to.have.property('message')
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

					it('should call library.logger.debug', () => {
						return expect(
							library.logger.debug.calledWith(
								'Receiving signatures disabled by user through config.json'
							)
						).to.be.true;
					});

					it('should not call library.schema.validate; function should return before', () => {
						return expect(library.schema.validate.called).to.be.false;
					});
				});

				describe('when library.schema.validate succeeds', () => {
					beforeEach(done => {
						transportInstance.shared.postSignatures(query);
						done();
					});

					it('should call __private.receiveSignatures with query.signatures as argument', () => {
						return expect(
							__private.receiveSignatures.calledWith(query.signatures)
						).to.be.true;
					});
				});
				describe('when library.schema.validate fails', () => {
					var validateErr;

					beforeEach(done => {
						validateErr = new Error('Transaction query did not match schema');
						validateErr.code = 'INVALID_FORMAT';

						library.schema.validate = sinonSandbox
							.stub()
							.callsArgWith(2, validateErr);
						transportInstance.shared.postSignatures(query);
						done();
					});

					it('should call library.logger.debug with "Invalid signatures body" and err as arguments', () => {
						return expect(
							library.logger.debug.calledWith(
								'Invalid signatures body',
								validateErr
							)
						).to.be.true;
					});
				});
			});

			describe('getSignatures', () => {
				var req;

				beforeEach(done => {
					req = {};
					modules.transactions.getMultisignatureTransactionList = sinonSandbox
						.stub()
						.returns(multisignatureTransactionsList);
					transportInstance.shared.getSignatures(req, (err, res) => {
						error = err;
						result = res;
						done();
					});
				});

				it('should call modules.transactions.getMultisignatureTransactionList with true and MAX_SHARED_TRANSACTIONS', () => {
					return expect(
						modules.transactions.getMultisignatureTransactionList.calledWith(
							true,
							MAX_SHARED_TRANSACTIONS
						)
					).to.be.true;
				});

				describe('when all transactions returned by modules.transactions.getMultisignatureTransactionList are multisignature transactions', () => {
					it('should call callback with error = null', () => {
						return expect(error).to.equal(null);
					});

					it('should call callback with result = {success: true, signatures: signatures} where signatures contains all transactions', () => {
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
						req = {};
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
						transportInstance.shared.getSignatures(req, (err, res) => {
							error = err;
							result = res;
							done();
						});
					});

					it('should call callback with error = null', () => {
						return expect(error).to.equal(null);
					});

					it('should call callback with result = {success: true, signatures: signatures} where signatures does not contain multisignature registration transactions', () => {
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
					query = {};
					transportInstance.shared.getTransactions(query, (err, res) => {
						error = err;
						result = res;
						done();
					});
				});

				it('should call modules.transactions.getMergedTransactionList with true and MAX_SHARED_TRANSACTIONS', () => {
					return expect(
						modules.transactions.getMergedTransactionList.calledWith(
							true,
							MAX_SHARED_TRANSACTIONS
						)
					).to.be.true;
				});

				it('should call callback with error = null', () => {
					return expect(error).to.equal(null);
				});

				it('should call callback with result = {success: true, transactions: transactions}', () => {
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
						nonce: validNonce,
						extraLogMessage: 'This is a log message',
					};
					__private.receiveTransaction = sinonSandbox
						.stub()
						.callsArgWith(3, null, transaction.id);
					transportInstance.shared.postTransaction(query, (err, res) => {
						error = err;
						result = res;
						done();
					});
				});

				it('should call __private.receiveTransaction with query.transaction, query.peer and query.extraLogMessage as arguments', () => {
					return expect(
						__private.receiveTransaction.calledWith(
							query.transaction,
							validNonce,
							query.extraLogMessage
						)
					).to.be.true;
				});

				describe('when __private.receiveTransaction succeeds', () => {
					it('should invoke callback with object { success: true, transactionId: id }', () => {
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
					var receiveTransactionError = 'Invalid transaction body ...';

					beforeEach(done => {
						__private.receiveTransaction = sinonSandbox
							.stub()
							.callsArgWith(3, receiveTransactionError);
						transportInstance.shared.postTransaction(query, (err, res) => {
							error = err;
							result = res;
							done();
						});
					});

					it('should invoke callback with object { success: false, message: err }', () => {
						expect(error).to.equal(null);
						expect(result)
							.to.have.property('success')
							.which.is.equal(false);
						return expect(result)
							.to.have.property('message')
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

					it('should call library.logger.debug', () => {
						return expect(
							library.logger.debug.calledWith(
								'Receiving transactions disabled by user through config.json'
							)
						).to.be.true;
					});

					it('should not call library.schema.validate; function should return before', () => {
						return expect(library.schema.validate.called).to.be.false;
					});
				});

				describe('when library.schema.validate succeeds', () => {
					beforeEach(done => {
						query = {
							transactions: transactionsList,
							nonce: validNonce,
							extraLogMessage: 'This is a log message',
						};
						__private.receiveTransactions = sinonSandbox.stub();
						transportInstance.shared.postTransactions(query);
						done();
					});

					it('should call __private.receiveTransactions with query.transaction, query.peer and query.extraLogMessage as arguments', () => {
						return expect(
							__private.receiveTransactions.calledWith(
								query.transactions,
								validNonce,
								query.extraLogMessage
							)
						).to.be.true;
					});
				});

				describe('when library.schema.validate fails', () => {
					var validateErr;

					beforeEach(done => {
						validateErr = new Error('Transaction query did not match schema');
						validateErr.code = 'INVALID_FORMAT';

						library.schema.validate = sinonSandbox
							.stub()
							.callsArgWith(2, [validateErr]);
						transportInstance.shared.postTransactions(query);
						done();
					});

					it('should invoke callback with error = null and result = {success: false, message: message}', () => {
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

		describe('Transport.prototype.internal', () => {
			var query;

			describe('updatePeer', () => {
				beforeEach(done => {
					query = {
						updateType: Rules.UPDATES.INSERT,
						peer: peerMock,
					};
					transportInstance.internal.updatePeer(query, err => {
						error = err;
						done();
					});
				});

				it('should call __private.checkInternalAccess with query', () => {
					return expect(__private.checkInternalAccess.calledWith(query)).to.be
						.true;
				});

				describe('when __private.checkInternalAccess fails', () => {
					var validateErr;

					beforeEach(done => {
						validateErr = 'Query did not match schema';
						query = {
							updateType: Rules.UPDATES.INSERT,
							peer: peerMock,
						};
						__private.checkInternalAccess = sinonSandbox
							.stub()
							.callsArgWith(1, validateErr);
						transportInstance.internal.updatePeer(query, err => {
							error = err;
							done();
						});
					});

					it('should call callback wit error = err', () => {
						return expect(error).to.equal(validateErr);
					});
				});

				describe('when __private.checkInternalAccess succeeds', () => {
					describe('updateResult', () => {
						describe('when query.updateType = 0 (insert)', () => {
							it('should call modules.peers.update with query.peer', () => {
								return expect(modules.peers.update.calledWith(query.peer)).to.be
									.true;
							});
						});

						describe('when query.updateType = 1 (remove)', () => {
							beforeEach(done => {
								query = {
									updateType: Rules.UPDATES.REMOVE,
									peer: peerMock,
								};
								// modules.peers.remove = sinonSandbox.stub().returns(true);
								__private.checkInternalAccess = sinonSandbox.stub().callsArg(1);
								transportInstance.internal.updatePeer(query, err => {
									error = err;
									done();
								});
							});

							it('should call modules.peers.remove with query.peer', () => {
								return expect(modules.peers.remove.calledWith(query.peer)).to.be
									.true;
							});
						});
					});

					describe('when updateResult !== true', () => {
						var errorCode = 4102;
						beforeEach(done => {
							query = {
								updateType: Rules.UPDATES.REMOVE,
								peer: peerMock,
							};
							modules.peers.remove = sinonSandbox.stub().returns(errorCode);
							__private.checkInternalAccess = sinonSandbox.stub().callsArg(1);
							transportInstance.internal.updatePeer(query, err => {
								error = err;
								done();
							});
						});

						it('should call callback with error = new PeerUpdateError(updateResult, "Request is made on the wrong network")', () => {
							expect(error)
								.to.have.property('code')
								.which.equals(errorCode);
							expect(error)
								.to.have.property('message')
								.which.equals('Request is made on the wrong network');
							return expect(error).to.have.property('description');
						});
					});

					describe('when updateResult = true', () => {
						it('should call callback with error = null', () => {
							return expect(error).to.equal(null);
						});
					});
				});
			});
		});
	});
});
