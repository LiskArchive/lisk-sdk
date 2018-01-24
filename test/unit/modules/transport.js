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

describe('transport', function () {

	var dbStub, loggerStub, busStub, schemaStub, networkStub, balancesSequenceStub,
		transactionStub, blockStub, peersStub, broadcasterStubRef, transportInstance,
		library, __private, modules, defaultScope, restoreRewiredTopDeps, peerStub, constants;

	const SAMPLE_SIGNATURE_1 = '32636139613731343366633732316664633534306665663839336232376538643634386432323838656661363165353632363465646630316132633233303739';
	const SAMPLE_SIGNATURE_2 = '61383939393932343233383933613237653864363438643232383865666136316535363236346564663031613263323330373784192003750382840553137595';

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
			add: function() {},
		};

		transactionStub = {
			attachAssetType: sinonSandbox.stub(),
		};

		blockStub = {};
		peersStub = {};

		restoreRewiredTopDeps = TransportModule.__set__({
			Broadcaster: function() {
				this.bind = function() {};
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
			nonce: 'sYHEDBKcScaAAAYg'
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
			it('should assign scope variables when instantiating', done => {
				var localTransportInstance = new TransportModule(
					(err, transportSelf) => {
						library = TransportModule.__get__('library');
						__private = TransportModule.__get__('__private');

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

						expect(err).to.equal(null);
						expect(transportSelf).to.equal(localTransportInstance);

						transportSelf.onBind(defaultScope);

						done();
					},
					defaultScope
				);
			});
		});
	});

	describe('__private', () => {
		var __privateOriginal;

		beforeEach(done => {
			__privateOriginal = {};

			new TransportModule((err, transportSelf) => {
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

				TransportModule.__set__({
					library: library,
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
			done();
		});

		describe('removePeer', () => {
			describe('when options.peer is undefined', () => {
				it('should call library.logger.debug with "Cannot remove empty peer"', done => {
					__private.removePeer({}, 'Custom peer remove message');
					expect(library.logger.debug.called).to.be.true;
					expect(library.logger.debug.calledWith('Cannot remove empty peer')).to
						.be.true;
					done();
				});

				it('should return false', done => {
					var result = __private.removePeer({}, 'Custom peer remove message');
					expect(result).to.be.false;
					done();
				});
			});

			describe('when options.peer is defined', function () {

				var removeSpy, peerData;
				var restoreNestedRewiredDeps;

				beforeEach(done => {
					removeSpy = sinonSandbox.spy();
					restoreNestedRewiredDeps = TransportModule.__set__({
						modules: {
							peers: {
								remove: removeSpy,
							},
						},
					});
					peerData = {
						ip: '127.0.0.1',
						wsPort: 8000,
					};
					done();
				});

				afterEach(function (done) {
					restoreNestedRewiredDeps();
					done();
				});

				it('should call library.logger.debug', done => {
					__private.removePeer(
						{
							peer: peerData,
						},
						'Custom peer remove message'
					);
					expect(library.logger.debug.called).to.be.true;
					done();
				});

				it('should call modules.peers.remove with options.peer', done => {
					__private.removePeer(
						{
							peer: peerData,
						},
						'Custom peer remove message'
					);
					expect(removeSpy.calledWith(peerData)).to.be.true;
					done();
				});
			});
		});

		describe('receiveSignatures', () => {
			beforeEach(done => {
				__private.receiveSignature = sinonSandbox.stub().callsArg(1);
				done();
			});

			it('should call library.schema.validate with empty query.signatures', done => {
				__private.receiveSignatures(
					{
						signatures: [],
					},
					() => {
						expect(library.schema.validate.called).to.be.true;
						done();
					}
				);
			});

			it('should call library.schema.validate with query.signatures', done => {
				__private.receiveSignatures(
					{
						signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
					},
					() => {
						expect(library.schema.validate.called).to.be.true;
						done();
					}
				);
			});

			it('should call library.schema.validate with custom schema.signatures', function (done) {
				var restoreDeps = TransportModule.__set__({
					definitions: {
						Signature: {
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
						},
					},
				});

				__private.receiveSignatures(
					{
						signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
					},
					() => {
						expect(library.schema.validate.called).to.be.true;

					restoreDeps();
					done();
				});
			});

			describe('when library.schema.validate fails', () => {
				it('should call series callback with error = "Invalid signatures body"', done => {
					var validateErr = new Error('Transaction did not match schema');
					validateErr.code = 'INVALID_FORMAT';
					library.schema.validate = sinonSandbox
						.stub()
						.callsArgWith(2, [validateErr]);

					__private.receiveSignatures(
						{
							signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
						},
						err => {
							expect(library.schema.validate.called).to.be.true;
							expect(err).to.equal('Invalid signatures body');
							done();
						}
					);
				});
			});

			describe('when library.schema.validate succeeds', () => {
				describe('for every signature in signatures', () => {
					it('should call __private.receiveSignature with signature', done => {
						__private.receiveSignatures(
							{
								signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
							},
							() => {
								expect(library.schema.validate.called).to.be.true;
								expect(__private.receiveSignature.calledTwice).to.be.true;
								expect(
									__private.receiveSignature.calledWith(SAMPLE_SIGNATURE_1)
								).to.be.true;
								expect(
									__private.receiveSignature.calledWith(SAMPLE_SIGNATURE_2)
								).to.be.true;
								done();
							}
						);
					});

					describe('when __private.receiveSignature fails', () => {
						beforeEach(done => {
							var err = 'Error processing signature: Error message';
							__private.receiveSignature = sinonSandbox
								.stub()
								.callsArgWith(1, err);
							done();
						});

						it('should call library.logger.debug with err and signature', done => {
							__private.receiveSignatures(
								{
									signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
								},
								err => {
									expect(library.schema.validate.called).to.be.true;
									// If any of the __private.receiveSignature calls fail, the whole
									// receiveSignatures operation should fail immediately.
									expect(__private.receiveSignature.calledOnce).to.be.true;
									expect(
										library.logger.debug.calledWith(err, SAMPLE_SIGNATURE_1)
									).to.be.true;
									done();
								}
							);
						});

						it('should call callback with error', done => {
							__private.receiveSignatures(
								{
									signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
								},
								err => {
									expect(err).to.equal(err);
									done();
								}
							);
						});
					});

					describe('when __private.receiveSignature succeeds', () => {
						it('should call callback with error null', done => {
							__private.receiveSignatures(
								{
									signatures: [SAMPLE_SIGNATURE_1, SAMPLE_SIGNATURE_2],
								},
								err => {
									expect(err).to.equal(null);
									done();
								}
							);
						});
					});
				});
			});
		});

		describe('receiveSignature', function () {
			var restoreNestedRewiredDeps;

			beforeEach(done => {
				library = {
					schema: {
						validate: sinonSandbox.stub().callsArg(2),
					},
				};

				modules = {
					multisignatures: {
						processSignature: sinonSandbox.stub().callsArg(1),
					},
				};

				restoreNestedRewiredDeps = TransportModule.__set__({
					library: library,
					modules: modules,
				});

				done();
			});

			afterEach(function (done) {
				restoreNestedRewiredDeps();
				done();
			});

			it('should call library.schema.validate with signature', done => {
				__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
					expect(err).to.equal(undefined);
					expect(library.schema.validate.calledOnce).to.be.true;
					expect(library.schema.validate.calledWith(SAMPLE_SIGNATURE_1)).to.be
						.true;
					done();
				});
			});

			describe('when library.schema.validate fails', () => {
				it('should call callback with error = "Invalid signature body"', done => {
					var validateErr = new Error('Transaction did not match schema');
					validateErr.code = 'INVALID_FORMAT';
					library.schema.validate = sinonSandbox
						.stub()
						.callsArgWith(2, [validateErr]);

					__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
						expect(err).to.equal(
							`Invalid signature body ${validateErr.message}`
						);
						done();
					});
				});
			});

			describe('when library.schema.validate succeeds', () => {
				it('should call modules.multisignatures.processSignature with signature', done => {
					__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
						expect(err).to.equal(undefined);
						expect(
							modules.multisignatures.processSignature.calledWith(
								SAMPLE_SIGNATURE_1
							)
						).to.be.true;
						done();
					});
				});

				describe('when modules.multisignatures.processSignature fails', () => {
					it('should call callback with error', done => {
						var processSignatureError = 'Transaction not found';
						modules.multisignatures.processSignature = sinonSandbox
							.stub()
							.callsArgWith(1, processSignatureError);

						__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
							expect(err).to.equal(
								`Error processing signature: ${processSignatureError}`
							);
							done();
						});
					});
				});

				describe('when modules.multisignatures.processSignature succeeds', () => {
					it('should call callback with error = undefined', done => {
						modules.multisignatures.processSignature = sinonSandbox
							.stub()
							.callsArg(1);

						__private.receiveSignature(SAMPLE_SIGNATURE_1, err => {
							expect(err).to.equal(undefined);
							done();
						});
					});
				});
			});
		});

		describe('receiveTransactions', function () {

			var restoreNestedRewiredDeps, query;

			beforeEach(done => {
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
				};

				restoreNestedRewiredDeps = TransportModule.__set__({
					library: library,
					modules: modules,
				});

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

			afterEach(function (done) {
				restoreNestedRewiredDeps();
				done();
			});

			// TODO: It doesn't seem that library.schema.validate currently gets called by the __private.receiveTransaction logic.
			it.skip('should call library.schema.validate with query and definitions.Transaction', done => {
				__private.receiveTransactions(query, peerStub, '', err => {
					expect(err).to.equal(null);
					expect(
						library.schema.validate.calledWith(
							query,
							defaultScope.swagger.definitions.Transaction
						)
					).to.be.true;
					done();
				});
			});

			// TODO: It doesn't seem that library.schema.validate currently gets called by the __private.receiveTransaction logic.
			describe.skip('when library.schema.validate fails', () => {
				it('should call callback with error = "Invalid transactions body"', done => {
					var validateErr = new Error('Transaction did not match schema');
					validateErr.code = 'INVALID_FORMAT';
					library.schema.validate = sinonSandbox
						.stub()
						.callsArgWith(2, [validateErr]);

					__private.receiveTransactions(query, peerStub, '', () => {
						expect(library.schema.validate.called).to.be.true;
						// TODO: Check that err is what we expect it to be.
						done();
					});
				});
			});

			describe('when library.schema.validate succeeds', () => {
				describe('for every transaction in transactions', () => {
					describe('when transaction is undefined', () => {
						beforeEach(done => {
							query.transactions[0] = undefined;
							done();
						});

						it('should call callback with error = "Unable to process transaction. Transaction is undefined."', done => {
							__private.receiveTransactions(query, peerStub, '', err => {
								expect(err).to.equal(
									'Unable to process transaction. Transaction is undefined.'
								);
								done();
							});
						});
					});

					describe('when transaction is defined', () => {
						it('should set transaction.bundled = true', done => {
							__private.receiveTransactions(query, peerStub, '', () => {
								expect(query.transactions[0])
									.to.have.property('bundled')
									.which.equals(true);
								done();
							});
						});

						it('should call __private.receiveTransaction with transaction with transaction, peer and extraLogMessage arguments', done => {
							__private.receiveTransactions(
								query,
								peerStub,
								'This is a log message',
								() => {
									expect(
										__private.receiveTransaction.calledWith(
											query.transactions[0],
											peerStub,
											'This is a log message'
										)
									).to.be.true;
									done();
								}
							);
						});

						describe('when call __private.receiveTransaction fails', () => {
							var receiveTransactionError;

							beforeEach(done => {
								receiveTransactionError = 'Invalid transaction body - ...';
								__private.receiveTransaction = sinonSandbox
									.stub()
									.callsArgWith(3, receiveTransactionError);
								done();
							});

							it('should call library.logger.debug with error and transaction', done => {
								__private.receiveTransactions(
									query,
									peerStub,
									'This is a log message',
									() => {
										expect(
											library.logger.debug.calledWith(
												receiveTransactionError,
												query.transactions[0]
											)
										).to.be.true;
										done();
									}
								);
							});

							it('should call callback with error', done => {
								__private.receiveTransactions(
									query,
									peerStub,
									'This is a log message',
									err => {
										expect(err).to.equal(receiveTransactionError);
										done();
									}
								);
							});
						});

						describe('when call __private.receiveTransaction succeeds', () => {
							it('should call callback with error = null', done => {
								__private.receiveTransactions(
									query,
									peerStub,
									'This is a log message',
									err => {
										expect(err).to.equal(null);
										done();
									}
								);
							});
						});
					});
				});
			});
		});

		describe('receiveTransaction', () => {
			var transaction;
			var peerAddressString;

			var transaction, peerAddressString, restoreNestedRewiredDeps;

			beforeEach(function () {
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

				library = {
					logic: {
						transaction: {
							objectNormalize: sinonSandbox.stub().returns(transaction),
						},
						peers: {
							peersManager: {
								getAddress: sinonSandbox.stub().returns(peerAddressString),
							},
						},
					},
					schema: {
						validate: sinonSandbox.stub().callsArg(2),
					},
					logger: {
						debug: sinonSandbox.spy(),
					},
					balancesSequence: balancesSequenceStub,
				};

				modules = {
					peers: {
						remove: sinonSandbox.stub().returns(true),
					},
					transactions: {
						processUnconfirmedTransaction: sinonSandbox.stub().callsArg(2),
					},
				};

				restoreNestedRewiredDeps = TransportModule.__set__({
					library: library,
					modules: modules,
				});
			});

			afterEach(function (done) {
				restoreNestedRewiredDeps();
				done();
			});

			it('should call library.logic.transaction.objectNormalize with transaction', function (done) {
				__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
					expect(library.logic.transaction.objectNormalize.calledWith(transaction)).to.be.true;
					done();
				});
			});

			describe('when library.logic.transaction.objectNormalize throws', function () {

				var objectNormalizeError;

				beforeEach(function (done) {
					objectNormalizeError = 'Unknown transaction type 0';
					library.logic.transaction.objectNormalize = sinonSandbox.stub().throws(objectNormalizeError);
					__private.removePeer = sinonSandbox.spy();
					done();
				});

				it('should call library.logger.debug with "Transaction normalization failed" error message and error details object', function (done) {
					__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
						var errorDetails = {id: transaction.id, err: 'Unknown transaction type 0', module: 'transport', transaction: transaction};
						expect(library.logger.debug.calledWith('Transaction normalization failed', errorDetails)).to.be.true;
						done();
					});
				});

				it('should call __private.removePeer with peer details object', function (done) {
					var extraLogMessage = 'This is a log message';
					__private.receiveTransaction(transaction, peerStub, extraLogMessage, function (err) {
						var peerDetails = {peer: peerStub, code: 'ETRANSACTION'};
						expect(__private.removePeer.calledWith(peerDetails, extraLogMessage)).to.be.true;
						done();
					});
				});

				it('should call callback with error = "Invalid transaction body"', function (done) {
					__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
						expect(err).to.equal('Invalid transaction body - ' + objectNormalizeError);
						done();
					});
				});
			});

			it('should call library.balancesSequence.add', function (done) {
				__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
					expect(library.balancesSequence.add.called).to.be.true;
					done();
				});
			});

			describe('when peer is undefined', function () {

				it('should call library.logger.debug with "Received transaction " + transaction.id + " from public client"', function (done) {
					__private.receiveTransaction(transaction, undefined, 'This is a log message', function (err) {
						expect(library.logger.debug.calledWith('Received transaction ' + transaction.id + ' from public client')).to.be.true;
						done();
					});
				});
			});

			describe('when peer is defined', function () {

				it('should call library.logger.debug with "Received transaction " + transaction.id + " from peer ..."', function (done) {
					__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
						expect(library.logger.debug.calledWith('Received transaction ' + transaction.id + ' from peer ' + peerAddressString)).to.be.true;
						done();
					});
				});

				it('should call library.logic.peers.peersManager.getAddress with peer.nonce', function (done) {
					__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
						expect(library.logic.peers.peersManager.getAddress.calledWith(peerStub.nonce)).to.be.true;
						done();
					});
				});
			});

			it('should call modules.transactions.processUnconfirmedTransaction with transaction and true as arguments', function (done) {
				__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
					expect(modules.transactions.processUnconfirmedTransaction.calledWith(transaction, true)).to.be.true;
					done();
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction fails', function () {

				var processUnconfirmedTransactionError;

				beforeEach(function (done) {
					processUnconfirmedTransactionError = 'Transaction is already processed: ' + transaction.id;
					modules.transactions.processUnconfirmedTransaction = sinonSandbox.stub().callsArgWith(2, processUnconfirmedTransactionError);
					done();
				});

				it('should call library.logger.debug with "Transaction ${transaction.id}" and error string', function (done) {
					__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
						expect(library.logger.debug.calledWith('Transaction ' + transaction.id, processUnconfirmedTransactionError)).to.be.true;
						done();
					});
				});

				describe('and transaction is defined', function () {

					it('should call library.logger.debug with "Transaction" and transaction as arguments', function (done) {
						__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
							expect(library.logger.debug.calledWith('Transaction', transaction)).to.be.true;
							done();
						});
					});
				});

				it('should call callback with err.toString()', function (done) {
					__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
						expect(err).to.equal(processUnconfirmedTransactionError);
						done();
					});
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', function () {

				it('should call callback with error = null', function (done) {
					__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err) {
						expect(err).to.equal(null);
						done();
					});
				});

				it('should call callback with result = transaction.id', function (done) {
					__private.receiveTransaction(transaction, peerStub, 'This is a log message', function (err, result) {
						expect(result).to.equal(transaction.id);
						done();
					});
				});
			});
		});
	});

	describe('Transport', function () {
		var restoreRewiredDeps;

		beforeEach(function (done) {

			transportInstance = new TransportModule(function (err, transportSelf) {

				transportSelf.onBind(defaultScope);

				library = {
					schema: {
						validate: sinonSandbox.stub().callsArg(2)
					},
					logger: {
						debug: sinonSandbox.spy()
					},
					config: {
						forging: {
							force: false
						}
					}
				};

				restoreRewiredDeps = TransportModule.__set__({
					library: library
				});

				modules = {
					peers: {
						calculateConsensus: sinonSandbox.stub().returns(100)
					}
				};

				constants = {
					minBroadhashConsensus: 51
				};

				restoreRewiredDeps = TransportModule.__set__({
					library: library,
					modules: modules
				});

				done();
			}, defaultScope);
		});

		afterEach(function (done) {
			restoreRewiredDeps();
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
			it('should call __private.broadcaster.getPeers ');

			it('should call __private.broadcaster.getPeers  with params');

			it('should call __private.broadcaster.getPeers  with callback');
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
