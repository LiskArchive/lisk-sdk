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

const application = require('../../../../common/application');

const { TRANSACTION_TYPES } = global.constants;

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

		afterEach(() => revert());

		it('should return true if submodules exists', async () => {
			// Arrange
			revert = library.rewiredSubmodules.signatures.__set__('submodules', {
				accounts: library.submodules.accounts,
				transactions: library.submodules.transactions,
				transport: library.submodules.transport,
			});

			// Act & assert
			return expect(library.submodules.signatures.isLoaded()).to.be.true;
		});

		it('should return true if submodules does not exist', async () => {
			// Arrange
			revert = library.rewiredSubmodules.signatures.__set__(
				'submodules',
				undefined
			);

			// Act & assert
			return expect(library.submodules.signatures.isLoaded()).to.be.false;
		});
	});

	describe('onBind', () => {
		let privateModules;

		beforeEach(() => {
			privateModules = library.rewiredSubmodules.signatures.__get__(
				'submodules'
			);
			return library.submodules.signatures.onBind({
				submodules: library.submodules,
			});
		});

		describe('submodules', () => {
			it('should assign accounts', async () =>
				expect(privateModules).to.have.property(
					'accounts',
					library.submodules.accounts
				));

			it('should assign transactions', async () =>
				expect(privateModules).to.have.property(
					'transactions',
					library.submodules.transactions
				));

			it('should assign transport', async () =>
				expect(privateModules).to.have.property(
					'transport',
					library.submodules.transport
				));
		});

		describe('assetTypes', () => {
			let signatureLogicSpy;

			before(done => {
				signatureLogicSpy = sinonSandbox.spy(
					library.rewiredSubmodules.signatures.__get__('__private').assetTypes[
						TRANSACTION_TYPES.SIGNATURE
					],
					'bind'
				);
				done();
			});

			after(() => signatureLogicSpy.restore());

			it('should call bind on signature logic with scope.accounts', async () =>
				expect(signatureLogicSpy).to.be.calledWith(
					library.submodules.accounts
				));
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
				library.submodules.transport.shared,
				'postSignature'
			);
			library.submodules.signatures.shared.postSignature(req.body, null);
			done();
		});

		afterEach(() => sinonSandbox.restore());

		it('should call submodules.transport.shared.postSignature with req.body', async () =>
			expect(postSignatureStub).to.be.calledWith({
				signature: req.body,
			}));

		describe('when submodules.transport.shared.postSignature fails with result', () => {
			it('should call callback with ApiError containing code = 400', done => {
				// Force library.submodules.transport.shared.postSignature to fail with custom message
				// Arrange
				const expectedData = {
					success: false,
					message: 'Invalid signature body',
				};

				postSignatureStub.yields(null, expectedData);
				// Act
				library.submodules.signatures.shared.postSignature(
					req.body,
					(error, data) => {
						expect(data).to.deep.equal(expectedData);
						done();
					}
				);
			});
		});

		describe('when submodules.transport.shared.postSignature succeeds with result', () => {
			let postSignatureError;
			let postSignatureResult;

			beforeEach(done => {
				// Force library.submodules.transport.shared.postSignature to succeed
				postSignatureStub.yields(null, {
					success: true,
				});

				library.submodules.signatures.shared.postSignature(
					req.body,
					(error, result) => {
						postSignatureError = error;
						postSignatureResult = result;
						done();
					}
				);
			});

			afterEach(() => postSignatureStub.restore());

			it('should call callback with error = null', async () =>
				expect(postSignatureError).to.be.null);

			it('should call callback with result success == true', async () => {
				expect(postSignatureResult).to.deep.equal({
					success: true,
				});
			});
		});
	});
});

/* eslint-enable mocha/no-pending-tests */
