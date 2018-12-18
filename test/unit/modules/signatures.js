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

const application = require('../../common/application');
const transactionTypes = require('../../../helpers/transaction_types');
const ApiError = require('../../../helpers/api_error');

/* eslint-disable mocha/no-pending-tests */
/* eslint-disable no-unused-vars */
describe('signatures', () => {
	let library;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_modules_signatures' } },
			(err, scope) => {
				library = scope;
				done(err);
			}
		);
	});

	describe('isLoaded', () => {
		it('should return true if modules exists', done => {
			library.rewiredModules.signatures.__set__('modules', {
				accounts: library.modules.accounts,
				transactions: library.modules.transactions,
				transport: library.modules.transport,
			});
			expect(library.modules.signatures.isLoaded()).to.be.true;
			done();
		});

		it('should return true if modules does not exist', done => {
			const revert = library.rewiredModules.signatures.__set__(
				'modules',
				undefined
			);
			expect(library.modules.signatures.isLoaded()).to.be.false;
			revert();
			done();
		});
	});

	describe('onBind', () => {
		let privateModules;
		let signatureLogicSpy;

		before(done => {
			privateModules = library.rewiredModules.signatures.__get__('modules');
			signatureLogicSpy = sinonSandbox.spy(
				library.rewiredModules.signatures.__get__('__private').assetTypes[
					transactionTypes.SIGNATURE
				],
				'bind'
			);
			library.modules.signatures.onBind(library.modules);
			done();
		});

		describe('modules', () => {
			it('should assign accounts', done => {
				expect(privateModules).to.have.property(
					'accounts',
					library.modules.accounts
				);
				done();
			});

			it('should assign transactions', done => {
				expect(privateModules).to.have.property(
					'transactions',
					library.modules.transactions
				);
				done();
			});

			it('should assign transport', done => {
				expect(privateModules).to.have.property(
					'transport',
					library.modules.transport
				);
				done();
			});
		});

		describe('assetTypes', () => {
			it('should call bind on signature logic with scope.accounts', done => {
				expect(signatureLogicSpy).to.be.calledWith(library.modules.accounts);
				done();
			});
		});
	});

	describe('shared', () => {
		describe('postSignature', () => {
			describe('when modules are not loaded', () => {
				it('should call callback with ApiError');
				it(
					'should call callback with ApiError containing message = "Blockchain is loading"'
				);
				it('should call callback with ApiError containing code = 500');
			});

			describe('when modules are loaded', () => {
				// Doesnt matter if request args are not valid as that is out of this scope for this tests
				const req = {
					body: {
						signature: 'aSignature',
						transactionId: 'aTransactionId',
						publicKey: 'aPublicKey',
					},
				};

				let postSignatureSpy;

				before(done => {
					postSignatureSpy = sinonSandbox.spy(
						library.modules.transport.shared,
						'postSignature'
					);
					library.modules.signatures.shared.postSignature(
						req.body,
						(error, response) => {
							done();
						}
					);
				});

				it('should call modules.transport.shared.postSignature with req.body', done => {
					expect(postSignatureSpy).to.be.calledWith({ signature: req.body });
					sinonSandbox.restore();
					done();
				});

				describe('when modules.transport.shared.postSignature fails with result', () => {
					let postSignatureStub;

					before(done => {
						postSignatureStub = sinonSandbox.stub(
							library.modules.transport.shared,
							'postSignature'
						);
						done();
					});

					after(done => {
						sinonSandbox.restore();
						done();
					});

					it('should call callback with ApiError', done => {
						postSignatureStub.yields(null, { success: false });

						library.modules.signatures.shared.postSignature(
							req.body,
							(error, result) => {
								expect(error).to.be.instanceof(ApiError);
								done();
							}
						);
					});

					it(
						'should call callback with ApiError containing message = "Blockchain is loading"'
					);

					describe('when result.message = "Invalid signature body"', () => {
						it('should call callback with ApiError containing code = 400', done => {
							// Force library.modules.transport.shared.postSignature to fail with custom message
							postSignatureStub.yields(null, {
								success: false,
								message: 'Invalid signature body',
							});

							library.modules.signatures.shared.postSignature(
								req.body,
								(error, result) => {
									expect(error.code).to.equal(400);
									done();
								}
							);
						});
					});

					describe('when result.message != "Invalid signature body"', () => {
						it('should call callback with ApiError containing code = 500', done => {
							// Force library.modules.transport.shared.postSignature to fail with custom message
							postSignatureStub.yields(null, {
								success: false,
								message: 'A different message',
							});

							library.modules.signatures.shared.postSignature(
								req.body,
								(error, result) => {
									expect(error.code).to.equal(500);
									done();
								}
							);
						});
					});
				});

				describe('when modules.transport.shared.postSignature succeeds with result', () => {
					let postSignatureError;
					let postSignatureResult;

					before(done => {
						const postSignatureStub = sinonSandbox.stub(
							library.modules.transport.shared,
							'postSignature'
						);
						// Force library.modules.transport.shared.postSignature to succeed
						postSignatureStub.yields(null, {
							success: true,
						});

						library.modules.signatures.shared.postSignature(
							req.body,
							(error, result) => {
								postSignatureError = error;
								postSignatureResult = result;
								done();
							}
						);
					});

					it('should call callback with error = null', done => {
						expect(postSignatureError).to.be.null;
						done();
					});

					it('should call callback with result containing status = "Signature Accepted"', done => {
						expect(postSignatureResult.status).to.equal('Signature Accepted');
						done();
					});
				});
			});
		});
	});
});

/* eslint-enable mocha/no-pending-tests */
