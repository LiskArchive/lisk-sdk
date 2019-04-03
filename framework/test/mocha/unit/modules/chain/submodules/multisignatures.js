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
const accountsFixtures = require('../../../../fixtures/index').accounts;
const transactionsFixtures = require('../../../../fixtures/index').transactions;

const { TRANSACTION_TYPES } = global.constants;
const RewiredMultisignatures = rewire(
	'../../../../../../src/modules/chain/submodules/multisignatures'
);

const validAccount = new accountsFixtures.Account();

describe('multisignatures', () => {
	let __private;
	let self;
	let library;
	let validScope;
	const stubs = {};
	const data = {};
	let multisignaturesInstance;
	let attachAssetTypeStubResponse;

	function get(variable) {
		return RewiredMultisignatures.__get__(variable);
	}

	function set(variable, value) {
		return RewiredMultisignatures.__set__(variable, value);
	}

	beforeEach(done => {
		// Initialize stubs
		stubs.logger = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		stubs.schema = sinonSandbox.stub();
		stubs.busMessage = sinonSandbox.stub();
		stubs.balancesSequence = sinonSandbox.stub();
		stubs.bind = sinonSandbox.stub();
		stubs.channelPublish = sinonSandbox.stub();

		attachAssetTypeStubResponse = { bind: stubs.bind };
		stubs.attachAssetType = sinonSandbox
			.stub()
			.returns(attachAssetTypeStubResponse);
		stubs.verifySignature = sinonSandbox.stub();

		stubs.logic = {};
		stubs.logic.transaction = {
			attachAssetType: stubs.attachAssetType,
			verifySignature: stubs.verifySignature,
		};
		stubs.logic.account = sinonSandbox.stub();

		stubs.Multisignature = sinonSandbox.stub();
		set('Multisignature', stubs.Multisignature);

		stubs.logic.multisignature = new stubs.Multisignature(
			stubs.schema,
			stubs.logic.transaction,
			stubs.logic.account,
			stubs.logger,
			stubs.channel
		);
		stubs.Multisignature.resetHistory();

		// Create stubbed scope
		validScope = {
			components: {
				logger: stubs.logger,
				storage: {
					entities: {
						Account: {},
					},
				},
			},
			channel: {
				publish: stubs.channelPublish,
			},
			schema: stubs.schema,
			bus: { message: stubs.busMessage },
			balancesSequence: stubs.balancesSequence,
			logic: stubs.logic,
		};

		stubs.bindings = {
			modules: {
				accounts: sinonSandbox.stub(),
				transactions: sinonSandbox.stub(),
			},
		};

		// Create instance of multisignatures module
		multisignaturesInstance = new RewiredMultisignatures(
			(err, __multisignatures) => {
				self = __multisignatures;
				__private = get('__private');
				library = get('library');
				self.onBind(stubs.bindings);
				done(err);
			},
			validScope
		);
	});

	describe('constructor', () => {
		it('should assign params to library', async () => {
			expect(library.channel).to.eql(validScope.channel);
			expect(library.logger).to.eql(validScope.components.logger);
			expect(library.storage).to.eql(validScope.components.storage);
			expect(library.schema).to.eql(validScope.schema);
			expect(library.bus).to.eql(validScope.bus);
			expect(library.balancesSequence).to.eql(validScope.balancesSequence);
			expect(library.logic.transaction).to.eql(validScope.logic.transaction);
			expect(library.logic.account).to.eql(validScope.logic.account);
			return expect(library.logic.multisignature).to.eql(
				validScope.logic.multisignature
			);
		});

		it('should instantiate Multisignature logic with proper params', async () => {
			expect(stubs.Multisignature).to.have.been.calledOnce;
			return expect(stubs.Multisignature).to.have.been.calledWith({
				components: {
					logger: validScope.components.logger,
				},
				schema: validScope.schema,
				logic: {
					transaction: validScope.logic.transaction,
					account: validScope.logic.account,
				},
				channel: validScope.channel,
			});
		});

		it('should call callback with result = self', async () =>
			expect(self).to.be.deep.equal(multisignaturesInstance));

		describe('__private', () => {
			it('should call library.logic.transaction.attachAssetType', async () =>
				expect(library.logic.transaction.attachAssetType).to.have.been
					.calledOnce);

			it('should assign __private.assetTypes[TRANSACTION_TYPES.MULTI]', async () =>
				expect(__private.assetTypes)
					.to.have.property(TRANSACTION_TYPES.MULTI)
					.which.is.equal(attachAssetTypeStubResponse));
		});
	});

	describe('onBind', () => {
		it('should set modules', async () =>
			expect(get('modules')).to.deep.equal(stubs.bindings.modules));
	});

	describe('__private.isValidSignature', () => {
		beforeEach(done => {
			// Set some random data used for tests
			data.transaction = new transactionsFixtures.Transaction({
				type: TRANSACTION_TYPES.MULTI,
			});
			data.signatures = [
				{
					transactionId: data.transaction.id,
					publicKey: 'publicKey1',
					signature: 'signature1',
				},
				{
					transactionId: data.transaction.id,
					publicKey: 'publicKey2',
					signature: 'signature2',
				},
			];
			data.signature = data.signatures[0];
			data.membersPublicKeys = ['publicKey1', 'publicKey2'];
			done();
		});

		describe('when signature data contains publicKey', () => {
			describe('when publicKey is not present as member of multisignature account in transaction', () => {
				it('should return false', async () => {
					data.signature.publicKey = 'not_present';
					const result = __private.isValidSignature(
						data.signature,
						data.membersPublicKeys,
						data.transaction
					);
					expect(library.logger.error).to.have.been.calledWith(
						'Unable to process signature, signer not in keysgroup.',
						{
							signature: data.signature,
							membersPublicKeys: data.membersPublicKeys,
							transaction: data.transaction,
						}
					);
					expect(stubs.verifySignature).to.have.not.been.called;
					return expect(result).to.be.false;
				});
			});

			describe('when publicKey is present as member of multisignature account in transaction', () => {
				describe('after calling library.logic.transaction.verifySignature', () => {
					describe('when validation is successfull', () => {
						it('should return true', async () => {
							stubs.verifySignature.returns(true);
							const result = __private.isValidSignature(
								data.signature,
								data.membersPublicKeys,
								data.transaction
							);
							expect(stubs.verifySignature).to.have.been.calledWith(
								data.transaction,
								data.signature.publicKey,
								data.signature.signature
							);
							expect(stubs.verifySignature).to.have.been.calledOnce;
							expect(library.logger.error).to.have.not.been.called;
							return expect(result).to.be.true;
						});
					});

					describe('when validation fails', () => {
						it('should return false', async () => {
							stubs.verifySignature.returns(false);
							const result = __private.isValidSignature(
								data.signature,
								data.membersPublicKeys,
								data.transaction
							);
							expect(stubs.verifySignature).to.have.been.calledWith(
								data.transaction,
								data.signature.publicKey,
								data.signature.signature
							);
							expect(stubs.verifySignature).to.have.been.calledOnce;
							expect(library.logger.error).to.have.not.been.called;
							return expect(result).to.be.false;
						});
					});

					describe('when error is thrown', () => {
						it('should return true', async () => {
							stubs.verifySignature.throws('verifySignature#ERR');
							const result = __private.isValidSignature(
								data.signature,
								data.membersPublicKeys,
								data.transaction
							);
							expect(stubs.verifySignature).to.have.been.calledWith(
								data.transaction,
								data.signature.publicKey,
								data.signature.signature
							);
							expect(stubs.verifySignature).to.have.been.calledOnce;
							expect(library.logger.error).to.have.been.calledWithMatch(
								'Unable to process signature, verification failed.',
								{
									signature: data.signature,
									membersPublicKeys: data.membersPublicKeys,
									transaction: data.transaction,
								}
							);
							expect(library.logger.error.args[0][1].error).to.include(
								'verifySignature#ERR'
							);
							return expect(result).to.be.false;
						});
					});
				});
			});
		});

		describe('when signature data contains no publicKey', () => {
			beforeEach(done => {
				delete data.signature.publicKey;
				done();
			});

			describe('after calling library.logic.transaction.verifySignature', () => {
				describe('when membersPublicKeys is empty', () => {
					it('should return false', async () => {
						data.membersPublicKeys = [];

						const result = __private.isValidSignature(
							data.signature,
							data.membersPublicKeys,
							data.transaction
						);
						expect(library.logger.error).to.have.not.been.called;
						expect(stubs.verifySignature).to.have.not.been.called;
						return expect(result).to.be.false;
					});
				});

				describe('when membersPublicKeys contains 1 entry', () => {
					beforeEach(done => {
						data.membersPublicKeys = [data.membersPublicKeys[0]];
						done();
					});

					describe('when validation is successfull', () => {
						it('should return true', async () => {
							stubs.verifySignature.returns(true);
							const result = __private.isValidSignature(
								data.signature,
								data.membersPublicKeys,
								data.transaction
							);
							expect(stubs.verifySignature).to.have.been.calledWith(
								data.transaction,
								data.membersPublicKeys[0],
								data.signature.signature
							);
							expect(stubs.verifySignature).to.have.been.calledOnce;
							return expect(result).to.be.true;
						});
					});

					describe('when validation fails', () => {
						it('should return false', async () => {
							stubs.verifySignature.returns(false);
							const result = __private.isValidSignature(
								data.signature,
								data.membersPublicKeys,
								data.transaction
							);
							expect(stubs.verifySignature).to.have.been.calledWith(
								data.transaction,
								data.membersPublicKeys[0],
								data.signature.signature
							);
							expect(stubs.verifySignature).to.have.been.calledOnce;
							return expect(result).to.be.false;
						});
					});

					describe('when error is thrown', () => {
						it('should return true', async () => {
							stubs.verifySignature.throws('verifySignature#ERR');
							const result = __private.isValidSignature(
								data.signature,
								data.membersPublicKeys,
								data.transaction
							);
							expect(stubs.verifySignature).to.have.been.calledWith(
								data.transaction,
								data.membersPublicKeys[0],
								data.signature.signature
							);
							expect(stubs.verifySignature).to.have.been.calledOnce;
							expect(library.logger.error).to.have.been.calledWithMatch(
								'Unable to process signature, verification failed.',
								{
									signature: data.signature,
									membersPublicKeys: data.membersPublicKeys,
									transaction: data.transaction,
								}
							);
							expect(library.logger.error.args[0][1].error).to.include(
								'verifySignature#ERR'
							);
							return expect(result).to.be.false;
						});
					});
				});

				describe('when membersPublicKeys contains 2 entries', () => {
					describe('when first entry passes validation', () => {
						describe('when second entry fails validation', () => {
							it('should return true', async () => {
								stubs.verifySignature
									.withArgs(
										data.transaction,
										data.membersPublicKeys[0],
										data.signature.signature
									)
									.returns(true);
								stubs.verifySignature
									.withArgs(
										data.transaction,
										data.membersPublicKeys[1],
										data.signature.signature
									)
									.returns(false);

								const result = __private.isValidSignature(
									data.signature,
									data.membersPublicKeys,
									data.transaction
								);
								expect(stubs.verifySignature).to.have.been.calledWith(
									data.transaction,
									data.membersPublicKeys[0],
									data.signature.signature
								);
								expect(stubs.verifySignature).to.have.been.calledOnce;
								return expect(result).to.be.true;
							});
						});

						describe('when error is thrown for second entry', () => {
							it('should return true', async () => {
								stubs.verifySignature
									.withArgs(
										data.transaction,
										data.membersPublicKeys[0],
										data.signature.signature
									)
									.returns(true);
								stubs.verifySignature
									.withArgs(
										data.transaction,
										data.membersPublicKeys[1],
										data.signature.signature
									)
									.throws('verifySignature#ERR');

								const result = __private.isValidSignature(
									data.signature,
									data.membersPublicKeys,
									data.transaction
								);
								expect(stubs.verifySignature).to.have.been.calledWith(
									data.transaction,
									data.membersPublicKeys[0],
									data.signature.signature
								);
								expect(stubs.verifySignature).to.have.been.calledOnce;
								return expect(result).to.be.true;
							});
						});
					});

					describe('when second entry passes validation', () => {
						describe('when first entry fails validation', () => {
							it('should return true', async () => {
								stubs.verifySignature
									.withArgs(
										data.transaction,
										data.membersPublicKeys[0],
										data.signature.signature
									)
									.returns(false);
								stubs.verifySignature
									.withArgs(
										data.transaction,
										data.membersPublicKeys[1],
										data.signature.signature
									)
									.returns(true);

								const result = __private.isValidSignature(
									data.signature,
									data.membersPublicKeys,
									data.transaction
								);
								expect(stubs.verifySignature).to.have.been.calledWith(
									data.transaction,
									data.membersPublicKeys[0],
									data.signature.signature
								);
								expect(stubs.verifySignature).to.have.been.calledWith(
									data.transaction,
									data.membersPublicKeys[1],
									data.signature.signature
								);
								expect(stubs.verifySignature).to.have.been.calledTwice;
								return expect(result).to.be.true;
							});
						});

						describe('when error is thrown for first entry', () => {
							it('should return false', async () => {
								stubs.verifySignature
									.withArgs(
										data.transaction,
										data.membersPublicKeys[0],
										data.signature.signature
									)
									.throws('verifySignature#ERR');
								stubs.verifySignature
									.withArgs(
										data.transaction,
										data.membersPublicKeys[1],
										data.signature.signature
									)
									.returns(true);

								const result = __private.isValidSignature(
									data.signature,
									data.membersPublicKeys,
									data.transaction
								);
								expect(stubs.verifySignature).to.have.been.calledWith(
									data.transaction,
									data.membersPublicKeys[0],
									data.signature.signature
								);
								expect(stubs.verifySignature).to.have.been.calledOnce;
								expect(library.logger.error).to.have.been.calledWithMatch(
									'Unable to process signature, verification failed.',
									{
										signature: data.signature,
										membersPublicKeys: data.membersPublicKeys,
										transaction: data.transaction,
									}
								);
								expect(library.logger.error.args[0][1].error).to.include(
									'verifySignature#ERR'
								);
								return expect(result).to.be.false;
							});
						});
					});

					describe('when no entry passes validation', () => {
						it('should return false', async () => {
							stubs.verifySignature
								.withArgs(
									data.transaction,
									data.membersPublicKeys[0],
									data.signature.signature
								)
								.returns(false);
							stubs.verifySignature
								.withArgs(
									data.transaction,
									data.membersPublicKeys[1],
									data.signature.signature
								)
								.returns(false);

							const result = __private.isValidSignature(
								data.signature,
								data.membersPublicKeys,
								data.transaction
							);
							expect(stubs.verifySignature).to.have.been.calledWith(
								data.transaction,
								data.membersPublicKeys[0],
								data.signature.signature
							);
							expect(stubs.verifySignature).to.have.been.calledWith(
								data.transaction,
								data.membersPublicKeys[1],
								data.signature.signature
							);
							expect(stubs.verifySignature).to.have.been.calledTwice;
							return expect(result).to.be.false;
						});
					});
				});
			});
		});
	});

	describe('__private.validateSignature', () => {
		beforeEach(done => {
			data.sender = new accountsFixtures.Account();
			stubs.isValidSignature = sinonSandbox.stub();
			__private.isValidSignature = stubs.isValidSignature;
			done();
		});

		describe('after calling __private.isValidSignature', () => {
			describe('when signature is invalid', () => {
				it('should call a callback with Error instance', done => {
					stubs.isValidSignature.returns(false);
					__private.validateSignature(
						data.signature,
						data.membersPublicKeys,
						data.transaction,
						data.sender,
						err => {
							expect(stubs.isValidSignature).to.have.been.calledWith(
								data.signature,
								data.membersPublicKeys,
								data.transaction
							);
							expect(stubs.isValidSignature).to.have.been.calledOnce;
							expect(err).to.be.an.instanceof(Error);
							expect(err.message).to.eql(
								'Unable to process signature, verification failed'
							);
							done();
						}
					);
				});
			});

			describe('when signature is valid', () => {
				beforeEach(done => {
					stubs.ready = sinonSandbox.stub().returns('ready');
					library.logic.multisignature = { ready: stubs.ready };
					stubs.isValidSignature.returns(true);
					__private.validateSignature(
						data.signature,
						data.membersPublicKeys,
						data.transaction,
						data.sender,
						done
					);
				});

				it('should set transaction.signature', async () =>
					expect(data.transaction.signatures).to.eql([
						data.signature.signature,
					]));

				it('should set transaction.ready', async () => {
					expect(stubs.ready).to.have.been.calledWith(
						data.transaction,
						data.sender
					);
					expect(stubs.ready).to.have.been.calledOnce;
					return expect(data.transaction.ready).to.eql('ready');
				});

				it('should publish events with proper data using channel', async () => {
					expect(stubs.channelPublish).to.have.been.calledWith(
						'chain:multisignatures:signature:change',
						data.transaction
					);
					expect(stubs.channelPublish).to.have.been.calledOnce;
					expect(stubs.busMessage).to.have.been.calledWith(
						'signature',
						data.signature,
						true
					);
					return expect(stubs.busMessage).to.have.been.calledOnce;
				});
			});
		});
	});

	describe('__private.processSignatureForMultisignatureAccountCreation', () => {
		beforeEach(done => {
			// Set some random data used for tests
			data.transaction = new transactionsFixtures.Transaction({
				type: TRANSACTION_TYPES.MULTI,
			});
			data.transaction.asset.multisignature.keysgroup = [
				'+publicKey1',
				'+publicKey2',
			];
			data.signature = {
				transactionId: data.transaction.id,
				publicKey: 'publicKey1',
				signature: 'signature1',
			};

			// Initialize stubs
			stubs.validateSignature = sinonSandbox.stub().callsArgWith(4, null);

			set('__private.validateSignature', stubs.validateSignature);
			__private.processSignatureForMultisignatureAccountCreation(
				data.signature,
				data.transaction,
				done
			);
		});

		describe('when calling __private.validateSignature', () => {
			it('should be called with proper data', async () => {
				const memberPublicKeys = ['publicKey1', 'publicKey2'];
				const sender = {};
				expect(stubs.validateSignature).to.have.been.calledWith(
					data.signature,
					memberPublicKeys,
					data.transaction,
					sender
				);
				return expect(stubs.validateSignature).to.have.been.calledOnce;
			});
		});
	});

	describe('__private.processSignatureFromMultisignatureAccount', () => {
		beforeEach(done => {
			// Set some random data used for tests
			data.sender = new accountsFixtures.Account();
			data.sender.membersPublicKeys = ['publicKey1', 'publicKey2'];

			data.transaction = new transactionsFixtures.Transaction({
				type: TRANSACTION_TYPES.MULTI,
			});
			data.signature = {
				transactionId: data.transaction.id,
				publicKey: 'publicKey1',
				signature: 'signature1',
			};

			// Initialize stubs
			stubs.validateSignature = sinonSandbox.stub().callsArgWith(4, null);
			set('__private.validateSignature', stubs.validateSignature);

			stubs.getAccount = sinonSandbox.stub();
			stubs.bindings.modules.accounts.getAccount = stubs.getAccount;
			done();
		});

		describe('when modules.accounts.getAccount returns an error', () => {
			it('should call a callback with Error instance', done => {
				stubs.getAccount.callsArgWith(1, 'getAccount#ERR');

				__private.processSignatureFromMultisignatureAccount(
					data.signature,
					data.transaction,
					err => {
						expect(stubs.getAccount).to.have.been.calledWith({
							address: data.transaction.senderId,
						});
						expect(stubs.getAccount).to.have.been.calledOnce;
						expect(err).to.be.an.instanceof(Error);
						expect(err.message).to.eql(
							'Unable to process signature, account not found'
						);
						expect(library.logger.error).to.have.been.calledWith(
							'Unable to process signature, account not found',
							{
								signature: data.signature,
								transaction: data.transaction,
								error: 'getAccount#ERR',
							}
						);
						done();
					}
				);
			});
		});

		describe('when modules.accounts.getAccount returns no error but sender = undefined', () => {
			it('should call a callback with Error instance', done => {
				const sender = undefined;
				stubs.getAccount.callsArgWith(1, null, sender);

				__private.processSignatureFromMultisignatureAccount(
					data.signature,
					data.transaction,
					err => {
						expect(stubs.getAccount).to.have.been.calledWith({
							address: data.transaction.senderId,
						});
						expect(stubs.getAccount).to.have.been.calledOnce;
						expect(err).to.be.an.instanceof(Error);
						expect(err.message).to.eql(
							'Unable to process signature, account not found'
						);
						expect(library.logger.error).to.have.been.calledWith(
							'Unable to process signature, account not found',
							{
								signature: data.signature,
								transaction: data.transaction,
								error: null,
							}
						);
						done();
					}
				);
			});
		});

		describe('when modules.accounts.getAccount returns no error', () => {
			describe('when calling __private.validateSignature', () => {
				it('should be called with proper data', done => {
					stubs.getAccount.callsArgWith(1, null, data.sender);

					__private.processSignatureFromMultisignatureAccount(
						data.signature,
						data.transaction,
						err => {
							expect(stubs.getAccount).to.have.been.calledWith({
								address: data.transaction.senderId,
							});
							expect(stubs.getAccount).to.have.been.calledOnce;
							expect(err).to.not.exist;
							expect(stubs.validateSignature).to.have.been.calledWith(
								data.signature,
								data.sender.membersPublicKeys,
								data.transaction,
								data.sender
							);
							expect(stubs.validateSignature).to.have.been.calledOnce;
							done();
						}
					);
				});
			});
		});
	});

	describe('processSignature', () => {
		beforeEach(done => {
			// Set some random data used for tests

			data.transaction = new transactionsFixtures.Transaction({
				type: TRANSACTION_TYPES.MULTI,
			});
			data.signature = {
				transactionId: data.transaction.id,
				publicKey: 'publicKey1',
				signature: 'signature1',
			};
			data.transaction.signatures = [];

			// Initialize stubs
			stubs.balancesSequence = sinonSandbox
				.stub()
				.callsFake((callback, doneCallback) => {
					callback(doneCallback);
				});
			library.balancesSequence.add = stubs.balancesSequence;

			stubs.getMultisignatureTransaction = sinonSandbox.stub();
			stubs.getMultisignatureTransaction.returns(data.transaction);
			stubs.bindings.modules.transactions.getMultisignatureTransaction =
				stubs.getMultisignatureTransaction;

			stubs.processSignatureForMultisignatureAccountCreation = sinonSandbox
				.stub()
				.callsArgWith(2, null);
			__private.processSignatureForMultisignatureAccountCreation =
				stubs.processSignatureForMultisignatureAccountCreation;

			stubs.processSignatureFromMultisignatureAccount = sinonSandbox
				.stub()
				.callsArgWith(2, null);
			__private.processSignatureFromMultisignatureAccount =
				stubs.processSignatureFromMultisignatureAccount;
			done();
		});

		describe('when signature is not present', () => {
			it('should call a callback with Error instance', done => {
				const signature = undefined;
				self.processSignature(signature, err => {
					expect(err).to.be.an.instanceof(Error);
					expect(err.message).to.eql(
						'Unable to process signature, signature not provided'
					);
					expect(library.logger.error).to.have.been.calledWith(
						'Unable to process signature, signature not provided'
					);
					done();
				});
			});
		});

		describe('when modules.transactions.getMultisignatureTransaction returns no transaction', () => {
			it('should call a callback with Error instance', done => {
				stubs.getMultisignatureTransaction.returns(undefined);
				self.processSignature(data.signature, err => {
					expect(err).to.be.an.instanceof(Error);
					expect(err.message).to.eql(
						'Unable to process signature, corresponding transaction not found'
					);
					expect(library.logger.error).to.have.been.calledWith(
						'Unable to process signature, corresponding transaction not found',
						{ signature: data.signature }
					);
					done();
				});
			});
		});

		describe('when signature already exists in transaction', () => {
			it('should call a callback with Error instance', done => {
				data.transaction.signatures = ['signature1'];
				self.processSignature(data.signature, err => {
					expect(stubs.getMultisignatureTransaction).to.have.been.calledWith(
						data.signature.transactionId
					);
					expect(stubs.getMultisignatureTransaction).to.have.been.calledOnce;
					expect(err).to.be.an.instanceof(Error);
					expect(err.message).to.eql(
						'Unable to process signature, signature already exists'
					);
					expect(library.logger.error).to.have.been.calledWith(
						'Unable to process signature, signature already exists',
						{ signature: data.signature, transaction: data.transaction }
					);
					done();
				});
			});
		});

		describe('when transaction have type MULTI', () => {
			it('should call __private.processSignatureForMultisignatureAccountCreation with proper params', done => {
				self.processSignature(data.signature, err => {
					expect(
						stubs.processSignatureForMultisignatureAccountCreation
					).to.have.been.calledWith(data.signature, data.transaction);
					expect(stubs.processSignatureForMultisignatureAccountCreation).to.have
						.been.calledOnce;
					expect(stubs.processSignatureFromMultisignatureAccount).to.have.not
						.been.called;
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when transaction have type other than MULTI', () => {
			it('should call __private.processSignatureFromMultisignatureAccount with proper params', done => {
				data.transaction.type = TRANSACTION_TYPES.SEND;
				self.processSignature(data.signature, err => {
					expect(
						stubs.processSignatureFromMultisignatureAccount
					).to.have.been.calledWith(data.signature, data.transaction);
					expect(stubs.processSignatureFromMultisignatureAccount).to.have.been
						.calledOnce;
					expect(stubs.processSignatureForMultisignatureAccountCreation).to.have
						.not.been.called;
					expect(err).to.not.exist;
					done();
				});
			});
		});
	});

	describe('getGroup', () => {
		beforeEach(done => {
			stubs.logic.account.getMultiSignature = sinonSandbox
				.stub()
				.callsFake((filters, cb) => cb(null, validAccount));

			stubs.getMemberPublicKeys = sinonSandbox
				.stub()
				.callsFake(() => Promise.resolve([]));

			stubs.bindings.modules.accounts.getAccounts = sinonSandbox
				.stub()
				.callsFake((param1, param2, cb) => cb(null, []));

			stubs.bindings.modules.accounts.generateAddressByPublicKey = sinonSandbox.stub();

			stubs.bindings.modules.accounts.generateAddressByPublicKey
				.withArgs('key1')
				.returns('address1');
			stubs.bindings.modules.accounts.generateAddressByPublicKey
				.withArgs('key2')
				.returns('address2');

			library.logic.account.getMultiSignature =
				stubs.logic.account.getMultiSignature;
			library.storage.entities.Account.getOne = sinonSandbox
				.stub()
				.resolves(validAccount);
			get('modules').accounts.getAccounts =
				stubs.bindings.modules.accounts.getAccounts;
			get('modules').accounts.generateAddressByPublicKey =
				stubs.bindings.modules.accounts.generateAddressByPublicKey;
			done();
		});

		it('should call getMultiSignature with given address', done => {
			self.getGroup(validAccount.address, async () => {
				expect(library.logic.account.getMultiSignature).to.be.calledWith({
					address: validAccount.address,
				});
				done();
			});
		});

		it('should return scopeGroup with given address', done => {
			self.getGroup(validAccount.address, (err, scopeGroup) => {
				expect(scopeGroup.address).to.equal(validAccount.address);
				done();
			});
		});

		it('should return an error if getMultiSignature function returns an error', done => {
			library.logic.account.getMultiSignature = sinonSandbox
				.stub()
				.callsFake((filters, cb) => {
					cb('Err', null);
				});
			self.getGroup(validAccount.address, (err, scopeGroup) => {
				expect(err).to.equal('Err');
				expect(scopeGroup).to.not.exist;
				done();
			});
		});

		it('should return an error if getMultiSignature function does not return an account', done => {
			library.logic.account.getMultiSignature = sinonSandbox
				.stub()
				.callsFake((filters, cb) => {
					cb(null, null);
				});
			self.getGroup('', (err, scopeGroup) => {
				expect(err.message).to.equal('Multisignature account not found');
				expect(scopeGroup).to.not.exist;
				done();
			});
		});

		it('should return a group if getMultiSignature function returns a valid multisig account', done => {
			self.getGroup(validAccount.address, (err, scopeGroup) => {
				expect(err).to.not.exist;
				expect(scopeGroup).to.have.property('address');
				expect(scopeGroup).to.have.property('publicKey');
				expect(scopeGroup).to.have.property('secondPublicKey');
				expect(scopeGroup).to.have.property('balance');
				expect(scopeGroup).to.have.property('unconfirmedBalance');
				expect(scopeGroup).to.have.property('min');
				expect(scopeGroup).to.have.property('lifetime');
				expect(scopeGroup).to.have.property('members');
				done();
			});
		});

		it('should return group members if account.membersPublicKeys returns an array of member account keys', done => {
			library.storage.entities.Account.getOne = sinonSandbox
				.stub()
				.callsFake(() =>
					Promise.resolve({ membersPublicKeys: ['key1', 'key2'] })
				);

			const member1 = {
				address: 'address',
				publicKey: 'publicKey',
				secondPublicKey: 'secondPublicKey',
			};

			const member2 = {
				address: 'address2',
				publicKey: 'publicKey2',
				secondPublicKey: 'secondPublicKey2',
			};

			stubs.bindings.modules.accounts.getAccounts = sinonSandbox
				.stub()
				.callsFake((param1, param2, cb) => cb(null, [member1, member2]));

			self.getGroup(validAccount.address, (err, scopeGroup) => {
				expect(err).to.not.exist;
				expect(get('modules').accounts.getAccounts).to.be.calledWith({
					address_in: ['address1', 'address2'],
				});
				expect(scopeGroup.members)
					.to.be.an('array')
					.which.have.lengthOf(2);
				expect(scopeGroup.members).to.deep.equal([member1, member2]);
				done();
			});
		});
	});

	describe('isLoaded', () => {
		it('should return true if modules exists', async () =>
			expect(self.isLoaded()).to.equal(true));

		it('should return false if modules does not exist', async () => {
			set('modules', null);
			return expect(self.isLoaded()).to.equal(false);
		});
	});
});
