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
		let revert;

		afterEach(() => {
			return revert();
		});

		it('should return true if modules exists', () => {
			// Arrange
			revert = library.rewiredModules.signatures.__set__('modules', {
				accounts: library.modules.accounts,
				transactions: library.modules.transactions,
				transport: library.modules.transport,
			});

			// Act & assert
			return expect(library.modules.signatures.isLoaded()).to.be.true;
		});

		it('should return true if modules does not exist', () => {
			// Arrange
			revert = library.rewiredModules.signatures.__set__('modules', undefined);

			// Act & assert
			return expect(library.modules.signatures.isLoaded()).to.be.false;
		});
	});

	describe('onBind', () => {
		let privateModules;

		beforeEach(() => {
			privateModules = library.rewiredModules.signatures.__get__('modules');
			return library.modules.signatures.onBind({
				modules: library.modules,
			});
		});

		describe('modules', () => {
			it('should assign accounts', () => {
				return expect(privateModules).to.have.property(
					'accounts',
					library.modules.accounts
				);
			});

			it('should assign transactions', () => {
				return expect(privateModules).to.have.property(
					'transactions',
					library.modules.transactions
				);
			});

			it('should assign transport', () => {
				return expect(privateModules).to.have.property(
					'transport',
					library.modules.transport
				);
			});
		});

		describe('assetTypes', () => {
			let signatureLogicSpy;

			before(done => {
				signatureLogicSpy = sinonSandbox.spy(
					library.rewiredModules.signatures.__get__('__private').assetTypes[
						transactionTypes.SIGNATURE
					],
					'bind'
				);
				done();
			});

			after(() => {
				return signatureLogicSpy.restore();
			});

			it('should call bind on signature logic with scope.accounts', () => {
				return expect(signatureLogicSpy).to.be.calledWith(
					library.modules.accounts
				);
			});
		});
	});

	describe('shared.postSignature', () => {
		const req = {
			body: {
				signature: 'aSignature',
				transactionId: 'aTransactionId',
				publicKey: 'aPublicKey',
			},
		};

		let postSignatureStub;

		beforeEach(done => {
			postSignatureStub = sinonSandbox.stub(
				library.modules.transport.shared,
				'postSignature'
			);
			library.modules.signatures.shared.postSignature(req.body, null);
			done();
		});

		afterEach(() => {
			return sinonSandbox.restore();
		});

		it('should call modules.transport.shared.postSignature with req.body', () => {
			return expect(postSignatureStub).to.be.calledWith({
				signature: req.body,
			});
		});

		describe('when modules.transport.shared.postSignature fails with result', () => {
			it('should call callback with ApiError', done => {
				// Arrange
				postSignatureStub.yields(null, { success: false });

				// Act
				library.modules.signatures.shared.postSignature(req.body, error => {
					// Assert
					expect(error).to.be.instanceof(ApiError);
					done();
				});
			});

			describe('when result.message = "Invalid signature body"', () => {
				it('should call callback with ApiError containing code = 400', done => {
					// Force library.modules.transport.shared.postSignature to fail with custom message
					// Arrange
					postSignatureStub.yields(null, {
						success: false,
						message: 'Invalid signature body',
					});
					// Act
					library.modules.signatures.shared.postSignature(req.body, error => {
						// Assert
						expect(error.code).to.equal(400);
						done();
					});
				});
			});

			describe('when result.message != "Invalid signature body"', () => {
				it('should call callback with ApiError containing code = 500', done => {
					// Force library.modules.transport.shared.postSignature to fail with custom message
					// Arrange
					postSignatureStub.yields(null, {
						success: false,
						message: 'A different message',
					});
					// Act
					library.modules.signatures.shared.postSignature(req.body, error => {
						// Assert
						expect(error.code).to.equal(500);
						done();
					});
				});
			});
		});

		describe('when modules.transport.shared.postSignature succeeds with result', () => {
			let postSignatureError;
			let postSignatureResult;

			beforeEach(done => {
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

			afterEach(() => {
				return postSignatureStub.restore();
			});

			it('should call callback with error = null', () => {
				return expect(postSignatureError).to.be.null;
			});

			it('should call callback with result containing status = "Signature Accepted"', () => {
				return expect(postSignatureResult.status).to.equal(
					'Signature Accepted'
				);
			});
		});
	});
});

/* eslint-enable mocha/no-pending-tests */
