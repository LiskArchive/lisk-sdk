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

const { TransactionError } = require('@liskhq/lisk-transactions');
const rewire = require('rewire');
const accountsFixtures = require('../../../../fixtures/index').accounts;
const transactionsFixtures = require('../../../../fixtures/index').transactions;

const { TRANSACTION_TYPES } = global.constants;
const RewiredMultisignatures = rewire(
	'../../../../../../src/modules/chain/submodules/multisignatures'
);

const validAccount = new accountsFixtures.Account();

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
				accounts: sinonSandbox.stub(),
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
