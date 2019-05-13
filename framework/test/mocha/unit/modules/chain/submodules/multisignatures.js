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

const { TransactionError } = require('@liskhq/lisk-transactions');
const rewire = require('rewire');
const transactionsFixtures = require('../../../../fixtures/index').transactions;

const { TRANSACTION_TYPES } = global.constants;
const RewiredMultisignatures = rewire(
	'../../../../../../src/modules/chain/submodules/multisignatures'
);

describe('multisignatures', () => {
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
				transactions: sinonSandbox.stub(),
				processTransactions: sinonSandbox.stub(),
			},
		};

		// Create instance of multisignatures module
		multisignaturesInstance = new RewiredMultisignatures(
			(err, __multisignatures) => {
				self = __multisignatures;
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
			return expect(library.logic.account).to.eql(validScope.logic.account);
		});

		it('should call callback with result = self', async () =>
			expect(self).to.be.deep.equal(multisignaturesInstance));
	});

	describe('onBind', () => {
		it('should set modules', async () =>
			expect(get('modules')).to.deep.equal(stubs.bindings.modules));
	});

	describe('getTransactionAndProcessSignature', () => {
		let transactionResponse;
		beforeEach(done => {
			// Set some random data used for tests
			data.transaction = new transactionsFixtures.Transaction({
				type: TRANSACTION_TYPES.MULTI,
			});
			transactionResponse = {
				id: data.transaction.id,
				status: 1,
				errors: [],
			};
			data.signature = {
				transactionId: data.transaction.id,
				publicKey: 'publicKey1',
				signature: 'signature1',
			};
			data.transaction.signatures = [];

			// Initialize stubs
			stubs.getMultisignatureTransaction = sinonSandbox.stub();
			stubs.getMultisignatureTransaction.returns(data.transaction);
			stubs.bindings.modules.transactions.getMultisignatureTransaction =
				stubs.getMultisignatureTransaction;
			stubs.processSignature = sinonSandbox
				.stub()
				.resolves(transactionResponse);
			stubs.bindings.modules.processTransactions.processSignature =
				stubs.processSignature;

			stubs.processSignatureForMultisignatureAccountCreation = sinonSandbox
				.stub()
				.callsArgWith(2, null);
			done();
		});

		describe('when signature is not present', () => {
			it('should call a callback with TransactionError instance', done => {
				const signature = undefined;
				self.getTransactionAndProcessSignature(signature, errors => {
					expect(errors[0]).to.be.an.instanceof(TransactionError);
					expect(errors[0].message).to.eql(
						'Unable to process signature, signature not provided'
					);
					done();
				});
			});
		});

		describe('when modules.transactions.getMultisignatureTransaction returns no transaction', () => {
			it('should call a callback with Error instance', done => {
				stubs.getMultisignatureTransaction.returns(undefined);
				self.getTransactionAndProcessSignature(data.signature, errors => {
					expect(errors[0]).to.be.an.instanceof(TransactionError);
					expect(errors[0].message).to.eql(
						'Unable to process signature, corresponding transaction not found'
					);
					done();
				});
			});
		});

		describe('when signature already exists in transaction', () => {
			it('should call a callback with Error instance', done => {
				stubs.processSignature.resolves({
					...transactionResponse,
					status: 0,
					errors: [
						new TransactionError('Signature already present in transaction.'),
					],
				});
				data.transaction.signatures = ['signature1'];
				self.getTransactionAndProcessSignature(data.signature, errors => {
					expect(stubs.getMultisignatureTransaction).to.have.been.calledWith(
						data.signature.transactionId
					);
					expect(stubs.getMultisignatureTransaction).to.have.been.calledOnce;
					expect(stubs.processSignature).to.have.been.calledOnce;
					expect(errors[0]).to.be.an.instanceof(TransactionError);
					expect(errors[0].message).to.eql(
						'Signature already present in transaction.'
					);
					done();
				});
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
