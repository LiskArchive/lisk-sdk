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
 *
 */
import { expect } from 'chai';
import { SinonStub } from 'sinon';
import * as cryptography from '@liskhq/lisk-cryptography';
import { MAX_TRANSACTION_AMOUNT } from '../src/constants';
import { BaseTransaction, MultisignatureStatus } from '../src/base_transaction';
import { TransactionJSON } from '../src/transaction_types';
import { Status } from '../src/response';
import { TransactionError, TransactionPendingError } from '../src/errors';
import * as BigNum from '@liskhq/bignum';
import {
	addTransactionFields,
	MockStateStore as store,
	TestTransaction,
	TestTransactionBasicImpl,
} from './helpers';
import { validSecondSignatureTransaction } from '../fixtures';
import * as transferFixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import * as transferSecondSignatureFixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_with_second_signature_validate.json';
import * as multisignatureFixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_with_multi_signature_validate.json';
import * as utils from '../src/utils';
import { TransferTransaction } from '../src/8_transfer_transaction';
import { SignatureObject } from '../src/create_signature_object';

describe('Base transaction class', () => {
	const defaultTransaction = addTransactionFields(
		transferFixture.testCases.output,
	);
	const defaultSenderAccount = {
		...transferFixture.testCases.input.account,
		balance: '1000000000000',
	};
	const defaultSecondSignatureTransaction = addTransactionFields(
		validSecondSignatureTransaction,
	);
	const defaultMultisignatureTransaction = addTransactionFields(
		multisignatureFixture.testCases.output,
	);
	const defaultMultisignatureAccount = {
		...multisignatureFixture.testCases.input.account,
		membersPublicKeys: multisignatureFixture.testCases.input.coSigners.map(
			account => account.publicKey,
		),
		balance: '94378900000',
		multiMin: 2,
		multiLifetime: 1,
	};
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	let validTestTransaction: BaseTransaction;
	let transactionWithDefaultValues: BaseTransaction;
	let transactionWithBasicImpl: BaseTransaction;
	let validSecondSignatureTestTransaction: BaseTransaction;
	let storeAccountGetStub: sinon.SinonStub;
	let storeAccountGetOrDefaultStub: sinon.SinonStub;
	let validMultisignatureTransaction: TransferTransaction;
	beforeEach(async () => {
		validTestTransaction = new TransferTransaction({
			...defaultTransaction,
			networkIdentifier,
		});
		transactionWithDefaultValues = new TransferTransaction({
			networkIdentifier,
		});
		transactionWithBasicImpl = new TestTransactionBasicImpl({
			networkIdentifier,
		});
		validSecondSignatureTestTransaction = new TransferTransaction({
			...defaultSecondSignatureTransaction,
			networkIdentifier,
		});
		validMultisignatureTransaction = new TransferTransaction({
			...defaultMultisignatureTransaction,
			networkIdentifier,
		});
		storeAccountGetStub = sandbox
			.stub(store.account, 'get')
			.returns(defaultSenderAccount);
		storeAccountGetOrDefaultStub = sandbox
			.stub(store.account, 'getOrDefault')
			.returns(defaultSenderAccount);
	});

	describe('#constructor', () => {
		it('should create a new instance of BaseTransaction', async () => {
			expect(validTestTransaction)
				.to.be.an('object')
				.and.be.instanceof(BaseTransaction);
		});

		it('should set default values', async () => {
			expect(transactionWithDefaultValues.fee.toString()).to.be.eql('10000000');
			expect(transactionWithDefaultValues.timestamp).to.be.eql(0);
			expect(transactionWithDefaultValues.type).to.be.eql(8);
			expect(transactionWithDefaultValues.confirmations).to.be.undefined;
			expect(transactionWithDefaultValues.blockId).to.be.undefined;
			expect(transactionWithDefaultValues.height).to.be.undefined;
			expect(transactionWithDefaultValues.receivedAt).to.be.undefined;
			expect(transactionWithDefaultValues.signSignature).to.be.undefined;
			expect(() => transactionWithDefaultValues.senderId).to.throw(
				'senderPublicKey is required to be set before use',
			);
			expect(() => transactionWithDefaultValues.senderPublicKey).to.throw(
				'senderPublicKey is required to be set before use',
			);
			expect(() => transactionWithDefaultValues.signature).to.throw(
				'signature is required to be set before use',
			);
		});

		it('should have fee of type BigNum', async () => {
			expect(validTestTransaction)
				.to.have.property('fee')
				.and.be.instanceof(BigNum);
		});

		it('should have default fee if fee param is invalid', async () => {
			const transactionWithInvalidFee = new TestTransaction({ fee: 'invalid' });

			expect(transactionWithInvalidFee.fee.toString()).to.be.eql('10000000');
		});

		it('should have id string', async () => {
			expect(validTestTransaction)
				.to.have.property('id')
				.and.be.a('string');
		});

		it('should have senderPublicKey string', async () => {
			expect(validTestTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signature string', async () => {
			expect(validTestTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signSignature string', async () => {
			expect(validTestTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signatures array', async () => {
			expect(validTestTransaction)
				.to.have.property('signatures')
				.and.be.a('array');
		});

		it('should have timestamp number', async () => {
			expect(validTestTransaction)
				.to.have.property('timestamp')
				.and.be.a('number');
		});

		it('should have type number', async () => {
			expect(validTestTransaction)
				.to.have.property('type')
				.and.be.a('number');
		});

		it('should have receivedAt Date', async () => {
			expect(validTestTransaction)
				.to.have.property('receivedAt')
				.and.be.instanceOf(Date);
		});

		it('should have _multisignatureStatus number', async () => {
			expect(validTestTransaction)
				.to.have.property('_multisignatureStatus')
				.and.be.a('number');
		});

		it('should have _networkIdentifier string', async () => {
			expect(validTestTransaction)
				.to.have.property('_networkIdentifier')
				.and.be.a('string');
		});

		it('should not throw with undefined input', async () => {
			expect(() => new TestTransaction(undefined as any)).not.to.throw();
		});

		it('should not throw with null input', async () => {
			expect(() => new TestTransaction(null as any)).not.to.throw();
		});

		it('should not throw with string input', async () => {
			expect(() => new TestTransaction('abc' as any)).not.to.throw();
		});

		it('should not throw with number input', async () => {
			expect(() => new TestTransaction(123 as any)).not.to.throw();
		});

		it('should not throw with incorrectly typed transaction properties', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				amount: 0,
				fee: 10,
			};
			expect(
				() =>
					new TestTransaction(
						(invalidTransaction as unknown) as TransactionJSON,
					),
			).not.to.throw();
		});
	});

	describe('#assetToJSON', async () => {
		it('should return an object of type transaction asset', async () => {
			expect(validTestTransaction.assetToJSON()).to.be.an('object');
		});
	});

	describe('#toJSON', () => {
		it('should call assetToJSON', async () => {
			const assetToJSONStub = sandbox
				.stub(validTestTransaction, 'assetToJSON')
				.returns({});
			validTestTransaction.toJSON();

			expect(assetToJSONStub).to.be.calledOnce;
		});

		it('should return transaction json', async () => {
			const transactionJSON = validTestTransaction.toJSON();

			expect(transactionJSON).to.be.eql({
				...defaultTransaction,
				senderId: '2129300327344985743L',
				fee: '10000000',
			});
		});
	});

	describe('#assetToBytes', () => {
		it('should return a buffer', async () => {
			expect(
				(validTestTransaction as TestTransaction).assetToBytes(),
			).to.be.an.instanceOf(Buffer);
		});
	});

	describe('#stringify', () => {
		it('should return the transaction stringified', async () => {
			expect(
				typeof (validTestTransaction as TestTransaction).stringify(),
			).to.be.eq('string');
		});
	});

	describe('#isReady', async () => {
		it('should return false on initialization of unknown transaction', async () => {
			expect(validTestTransaction.isReady()).to.be.false;
		});

		it('should return true on verification of non-multisignature transaction', async () => {
			validTestTransaction.apply(store);
			expect(validTestTransaction.isReady()).to.be.true;
		});

		it('should return false on verification of multisignature transaction with missing signatures', async () => {
			storeAccountGetStub.returns(defaultMultisignatureAccount);
			const multisignaturesTransaction = new TransferTransaction({
				...defaultMultisignatureTransaction,
				networkIdentifier,
				signatures: defaultMultisignatureTransaction.signatures.slice(0, 2),
			});
			multisignaturesTransaction.apply(store);

			expect(validMultisignatureTransaction.isReady()).to.be.false;
		});
	});

	describe('#getBasicBytes', () => {
		it('should call cryptography hexToBuffer', async () => {
			const cryptographyHexToBufferStub = sandbox
				.stub(cryptography, 'hexToBuffer')
				.returns(Buffer.from(validTestTransaction.senderPublicKey, 'hex'));

			(validTestTransaction as any).getBasicBytes();
			expect(cryptographyHexToBufferStub).to.be.calledWithExactly(
				defaultTransaction.senderPublicKey,
			);
		});

		it('should call assetToBytes for transaction with asset', async () => {
			const transactionWithAsset = {
				...defaultTransaction,
				asset: { amount: '1000', data: 'data', recipientId: '1L' },
			};
			const testTransactionWithAsset = new TestTransaction(
				transactionWithAsset,
			);
			const assetToBytesStub = sandbox
				.stub(testTransactionWithAsset, 'assetToBytes')
				.callThrough();
			(testTransactionWithAsset as any).getBasicBytes();

			expect(assetToBytesStub).to.be.calledOnce;
		});

		it('should return a buffer without signatures bytes', async () => {
			const expectedBuffer = Buffer.from(
				'08033ccd24efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d00000000499602d2fbc2d06c336d04be72616e646f6d2064617461',
				'hex',
			);
			expect((validTestTransaction as any).getBasicBytes()).to.eql(
				expectedBuffer,
			);
		});
	});

	describe('#getBytes', () => {
		it('should call getBasicBytes', async () => {
			const getBasicBytesStub = sandbox
				.stub(validTestTransaction as any, 'getBasicBytes')
				.returns(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c679324300000000000000000000000000000000',
						'hex',
					),
				);
			validTestTransaction.getBytes();

			expect(getBasicBytesStub).to.be.calledOnce;
		});

		it('should call cryptography hexToBuffer for transaction with signature', async () => {
			const cryptographyHexToBufferStub = sandbox
				.stub(cryptography, 'hexToBuffer')
				.returns(
					Buffer.from(
						'2092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
						'hex',
					),
				);
			validTestTransaction.getBytes();

			expect(cryptographyHexToBufferStub.secondCall).to.have.been.calledWith(
				validTestTransaction.signature,
			);
		});

		it('should call cryptography hexToBuffer for transaction with signSignature', async () => {
			const cryptographyHexToBufferStub = sandbox
				.stub(cryptography, 'hexToBuffer')
				.returns(
					Buffer.from(
						'2092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
						'hex',
					),
				);
			validSecondSignatureTestTransaction.getBytes();

			expect(cryptographyHexToBufferStub.thirdCall).to.have.been.calledWith(
				validSecondSignatureTestTransaction.signSignature,
			);
		});

		it('should return a buffer with signature bytes', async () => {
			const expectedBuffer = Buffer.from(
				'08033ccd24efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d00000000499602d2fbc2d06c336d04be72616e646f6d20646174619fc2b85879b6423893841343c1d8905f3b9118b7db96bbb589df771c35ce0d05ce446951ee827c76ed1a85951af40018a007a1663f1a43a50129a0e32f26cb03',
				'hex',
			);

			expect(validTestTransaction.getBytes()).to.eql(expectedBuffer);
		});

		it('should return a buffer with signSignature bytes', async () => {
			const expectedBuffer = Buffer.from(
				'0004cf2945bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e800000002540be400b95af897b7e23cb93357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e0111f77b8596df14400f5dd5cf9ef9bd2a20f66a48863455a163cabc0c220ea235d8b98dec684bd86f62b312615e7f64b23d7b8699775e7c15dad0aef0abd4f503',
				'hex',
			);

			expect(validSecondSignatureTestTransaction.getBytes()).to.eql(
				expectedBuffer,
			);
		});
	});

	describe('_validateSchema', () => {
		it('should call toJSON', async () => {
			const toJSONStub = sandbox
				.stub(validTestTransaction, 'toJSON')
				.returns({} as any);
			(validTestTransaction as any)._validateSchema();

			expect(toJSONStub).to.be.calledOnce;
		});

		it('should call cryptography getAddressFromPublicKey for transaction with valid senderPublicKey', async () => {
			sandbox
				.stub(cryptography, 'getAddressFromPublicKey')
				.returns('18278674964748191682L');
			(validTestTransaction as any)._validateSchema();

			expect(
				cryptography.getAddressFromPublicKey,
			).to.have.been.calledWithExactly(validTestTransaction.senderPublicKey);
		});

		it('should return a successful transaction response with a valid transaction', async () => {
			const errors = (validTestTransaction as any)._validateSchema();
			expect(errors).to.be.empty;
		});

		it('should return a failed transaction response with invalid formatting', async () => {
			const invalidTransaction = {
				type: 0,
				senderPublicKey: '11111111',
				timestamp: 79289378,
				asset: {},
				signature: '1111111111',
				id: '1',
			};
			const invalidTestTransaction = new TestTransaction(
				invalidTransaction as any,
			);
			const errors = (invalidTestTransaction as any)._validateSchema();

			expect(errors).to.not.be.empty;
		});

		it('should throw descriptive error when networkIdentifier is missing', async () => {
			const transactionWithMissingNetworkIdentifier = {
				...transferFixture.testCases.input.transaction,
			};

			const transactionWithMissingNetworkIdentifierInstance = new TestTransaction(
				transactionWithMissingNetworkIdentifier as any,
			);

			expect(() =>
				transactionWithMissingNetworkIdentifierInstance.sign(
					transferFixture.testCases.input.account.passphrase,
				),
			).to.throw('Network identifier is required to sign a transaction');
		});
	});

	describe('#validate', () => {
		// TODO: undo skip, as this test transaction is no longer valid signature
		// It does not include the amount and recipient
		it('should return a successful transaction response with a valid transaction', async () => {
			const { id, status, errors } = validTestTransaction.validate();

			expect(id).to.be.eql(validTestTransaction.id);
			expect(errors).to.be.empty;
			expect(status).to.eql(Status.OK);
		});

		it('should return a successful transaction response with a valid transaction with basic impl', async () => {
			transactionWithBasicImpl.sign('passphrase');
			const { id, status, errors } = transactionWithBasicImpl.validate();

			expect(id).to.be.eql(transactionWithBasicImpl.id);
			expect(errors).to.be.empty;
			expect(status).to.eql(Status.OK);
		});

		it('should call getBasicBytes', async () => {
			const getBasicBytesStub = sandbox
				.stub(validTestTransaction as any, 'getBasicBytes')
				.returns(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c679324300000000000000000000000000000000',
						'hex',
					),
				);
			validTestTransaction.validate();

			expect(getBasicBytesStub).to.be.calledTwice;
		});

		it('should call validateSignature', async () => {
			sandbox.stub(utils, 'validateSignature').returns({ valid: true });
			validTestTransaction.validate();

			expect(utils.validateSignature).to.be.calledWithExactly(
				validTestTransaction.senderPublicKey,
				validTestTransaction.signature,
				Buffer.concat([
					Buffer.from(networkIdentifier, 'hex'),
					(validTestTransaction as any).getBasicBytes(),
				]),
				validTestTransaction.id,
			);
		});

		it('should return a failed transaction response with invalid signature', async () => {
			const invalidSignature = defaultTransaction.signature.replace('1', '0');
			const invalidSignatureTransaction = {
				...defaultTransaction,
				signature: invalidSignature,
			};
			const invalidSignatureTestTransaction = new TestTransaction({
				...(invalidSignatureTransaction as any),
				networkIdentifier,
			});
			sandbox
				.stub(invalidSignatureTestTransaction as any, '_validateSchema')
				.returns([]);
			const { id, status, errors } = invalidSignatureTestTransaction.validate();

			expect(id).to.be.eql(invalidSignatureTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Failed to validate signature ${invalidSignature}`,
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with duplicate signatures', async () => {
			const invalidSignaturesTransaction = {
				...defaultTransaction,
				signatures: [
					defaultTransaction.signature,
					defaultTransaction.signature,
				],
			};
			const invalidSignaturesTestTransaction = new TestTransaction(
				invalidSignaturesTransaction as any,
			);
			const {
				id,
				status,
				errors,
			} = invalidSignaturesTestTransaction.validate();

			expect(id).to.be.eql(invalidSignaturesTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('dataPath', '.signatures');
			expect(status).to.eql(Status.FAIL);
		});

		it('should throw when networkIdentifier is not provided', async () => {
			const trsWithoutNetworkIdentifier = new TransferTransaction({
				...defaultTransaction,
			});
			expect(() => trsWithoutNetworkIdentifier.validate()).to.throw(
				'Network identifier is required to validate a transaction ',
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a transaction response', async () => {
			const otherTransactions = [defaultTransaction, defaultTransaction];
			const {
				id,
				status,
				errors,
			} = validTestTransaction.verifyAgainstOtherTransactions(
				otherTransactions,
			);
			expect(id).to.be.eql(validTestTransaction.id);
			expect(errors).to.be.empty;
			expect(status).to.eql(Status.OK);
		});
	});

	describe('#processMultisignatures', () => {
		it('should return a successful transaction response with valid signatures', async () => {
			sandbox.stub(utils, 'verifyMultiSignatures').returns({
				status: MultisignatureStatus.READY,
				errors: [],
			});
			const {
				id,
				status,
				errors,
			} = validMultisignatureTransaction.processMultisignatures(store);

			expect(id).to.be.eql(validMultisignatureTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});

		it('should return a pending transaction response with missing signatures', async () => {
			const pendingErrors = [
				new TransactionPendingError(
					`Missing signatures`,
					validMultisignatureTransaction.id,
					'.signatures',
				),
			];
			sandbox.stub(utils, 'verifyMultiSignatures').returns({
				status: MultisignatureStatus.PENDING,
				errors: pendingErrors,
			});
			const {
				id,
				status,
				errors,
			} = validMultisignatureTransaction.processMultisignatures(store);

			expect(id).to.be.eql(validMultisignatureTransaction.id);
			expect(errors).to.be.eql(pendingErrors);
			expect(status).to.eql(Status.PENDING);
		});
	});

	describe('#addVerifiedMultisignature', () => {
		it('should return a successful transaction response if no duplicate signatures', async () => {
			const {
				id,
				status,
				errors,
			} = validMultisignatureTransaction.addVerifiedMultisignature(
				'3df1fae6865ec72783dcb5f87a7d906fe20b71e66ad9613c01a89505ebd77279e67efa2c10b5ad880abd09efd27ea350dd8a094f44efa3b4b2c8785fbe0f7e00',
			);

			expect(id).to.be.eql(validMultisignatureTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});

		it('should return a failed transaction response if duplicate signatures', async () => {
			const {
				id,
				status,
				errors,
			} = validMultisignatureTransaction.addVerifiedMultisignature(
				'4424342c342093f80f52f919876fc0abada5385e98e8caf211add16d1c0f5453ef6e47fa58a454128a9640f3b6e2ade618e5ee5fa8eebc4d68460d19f042050f',
			);

			expect(id).to.be.eql(validMultisignatureTransaction.id);
			expect(status).to.eql(Status.FAIL);
			(errors as ReadonlyArray<TransactionError>).forEach(error =>
				expect(error)
					.to.be.instanceof(TransactionError)
					.and.to.have.property('message', 'Failed to add signature.'),
			);
		});
	});

	describe('#addMultisignature', () => {
		let transferFromMultiSigAccountTrs: TransferTransaction;
		let multisigMember: SignatureObject;
		beforeEach(async () => {
			storeAccountGetStub.returns(defaultMultisignatureAccount);
			const {
				signatures,
				...trsWithoutSignatures
			} = validMultisignatureTransaction.toJSON();
			transferFromMultiSigAccountTrs = new TransferTransaction({
				...trsWithoutSignatures,
				networkIdentifier,
			});
			multisigMember = {
				transactionId: multisignatureFixture.testCases.output.id,
				publicKey: multisignatureFixture.testCases.input.coSigners[0].publicKey,
				signature: multisignatureFixture.testCases.output.signatures[0],
			};
		});

		it('should add signature to transaction from multisig account', async () => {
			const {
				status,
				errors,
			} = transferFromMultiSigAccountTrs.addMultisignature(
				store,
				multisigMember,
			);

			expect(status).to.eql(Status.PENDING);
			expect(errors[0]).to.be.instanceof(TransactionPendingError);
			expect(transferFromMultiSigAccountTrs.signatures).to.include(
				multisigMember.signature,
			);
		});

		it('should fail when valid signature already present and sent again', async () => {
			const {
				status: arrangeStatus,
			} = transferFromMultiSigAccountTrs.addMultisignature(
				store,
				multisigMember,
			);

			expect(arrangeStatus).to.eql(Status.PENDING);

			const {
				status,
				errors,
			} = transferFromMultiSigAccountTrs.addMultisignature(
				store,
				multisigMember,
			);
			const expectedError = `Signature '${multisignatureFixture.testCases.output.signatures[0]}' already present in transaction.`;

			expect(status).to.eql(Status.FAIL);
			expect(errors[0].message).to.be.eql(expectedError);
			expect(transferFromMultiSigAccountTrs.signatures).to.include(
				multisigMember.signature,
			);
		});

		it('should fail to add invalid signature to transaction from multisig account', () => {
			storeAccountGetStub.returns(defaultMultisignatureAccount);
			const { signatures, ...rawTrs } = validMultisignatureTransaction.toJSON();
			const transferFromMultiSigAccountTrs = new TransferTransaction({
				...rawTrs,
				networkIdentifier,
			});
			const multisigMember = {
				transactionId: transferFromMultiSigAccountTrs.id,
				publicKey:
					'542fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
				signature:
					'eeee799c2d30d2be6e7b70aa29b57f9b1d6f2801d3fccf5c99623ffe45526104b1f0652c2cb586c7ae201d2557d8041b41b60154f079180bb9b85f8d06b3010c',
			};

			const {
				status,
				errors,
			} = transferFromMultiSigAccountTrs.addMultisignature(
				store,
				multisigMember,
			);

			const expectedError = `Public Key '${multisigMember.publicKey}' is not a member for account '${defaultMultisignatureAccount.address}'.`;

			expect(status).to.eql(Status.FAIL);
			expect(errors[0].message).to.be.eql(expectedError);
			expect(transferFromMultiSigAccountTrs.signatures).to.be.empty;
		});

		it('should fail with signature not part of the group', () => {
			storeAccountGetStub.returns(defaultMultisignatureAccount);
			const { signatures, ...rawTrs } = validMultisignatureTransaction.toJSON();
			const transferFromMultiSigAccountTrs = new TransferTransaction({
				...rawTrs,
				networkIdentifier,
			});
			const multisigMember = {
				transactionId: transferFromMultiSigAccountTrs.id,
				publicKey:
					'542fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33c2',
				signature:
					'eeee799c2d30d2be6e7b70aa29b57f9b1d6f2801d3fccf5c99623ffe45526104b1f0652c2cb586c7ae201d2557d8041b41b60154f079180bb9b85f8d06b3010c',
			};

			const {
				status,
				errors,
			} = transferFromMultiSigAccountTrs.addMultisignature(
				store,
				multisigMember,
			);

			const expectedError =
				"Public Key '542fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33c2' is not a member for account '2129300327344985743L'.";

			expect(status).to.eql(Status.FAIL);
			expect(errors[0].message).to.be.eql(expectedError);
			expect(transferFromMultiSigAccountTrs.signatures).to.be.empty;
		});
	});

	describe('#apply', () => {
		it('should return a successful transaction response with an updated sender account', async () => {
			store.account.getOrDefault = () => defaultSenderAccount;
			const { id, status, errors } = validTestTransaction.apply(store);

			expect(id).to.be.eql(validTestTransaction.id);
			expect(status).to.eql(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return a failed transaction response with insufficient account balance', async () => {
			storeAccountGetOrDefaultStub.returns({
				...defaultSenderAccount,
				balance: '0',
			});
			const { id, status, errors } = validTestTransaction.apply(store);

			expect(id).to.be.eql(validTestTransaction.id);
			expect(status).to.eql(Status.FAIL);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Account does not have enough LSK: ${defaultSenderAccount.address}, balance: 0`,
				);
		});
	});

	describe('#undo', () => {
		it('should return a successful transaction response with an updated sender account', async () => {
			const { id, status, errors } = validTestTransaction.undo(store);
			expect(id).to.be.eql(validTestTransaction.id);
			expect(status).to.eql(Status.OK);
			expect(errors).to.be.eql([]);
		});

		it('should return a failed transaction response with account balance exceeding max amount', async () => {
			storeAccountGetOrDefaultStub.returns({
				...defaultSenderAccount,
				balance: MAX_TRANSACTION_AMOUNT.toString(),
			});
			const { id, status, errors } = validTestTransaction.undo(store);
			expect(id).to.be.eql(validTestTransaction.id);
			expect(status).to.eql(Status.FAIL);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', 'Invalid balance amount');
		});
	});

	describe('#isExpired', () => {
		let unexpiredTestTransaction: BaseTransaction;
		let expiredTestTransaction: BaseTransaction;
		beforeEach(async () => {
			const unexpiredTransaction = {
				...defaultTransaction,
				receivedAt: new Date().toISOString(),
			};
			const expiredTransaction = {
				...defaultTransaction,
				receivedAt: new Date(+new Date() - 1300 * 60000).toISOString(),
			};
			unexpiredTestTransaction = new TestTransaction(unexpiredTransaction);
			expiredTestTransaction = new TestTransaction(expiredTransaction);
		});

		it('should return false for unexpired transaction', async () => {
			expect(unexpiredTestTransaction.isExpired()).to.be.false;
		});

		it('should return true for expired transaction', async () => {
			expect(expiredTestTransaction.isExpired(new Date())).to.be.true;
		});
	});

	describe('create, sign and stringify transaction', () => {
		it('should return correct senderId/senderPublicKey when sign with passphrase', () => {
			const newTransaction = new TransferTransaction({
				...transferSecondSignatureFixture.testCases.input.transaction,
				networkIdentifier:
					transferSecondSignatureFixture.testCases.input.networkIdentifier,
			});
			newTransaction.sign(
				transferSecondSignatureFixture.testCases.input.account.passphrase,
			);

			const stringifiedTransaction = newTransaction.stringify();
			const parsedResponse = JSON.parse(stringifiedTransaction);

			expect(parsedResponse.senderPublicKey).to.be.eql(
				transferSecondSignatureFixture.testCases.output.senderPublicKey,
			);
			expect(parsedResponse.signature).to.be.eql(
				transferSecondSignatureFixture.testCases.output.signature,
			);
		});

		it('should return correct senderId/senderPublicKey when sign with passphrase and secondPassphrase', () => {
			const newTransaction = new TransferTransaction({
				...transferSecondSignatureFixture.testCases.input.transaction,
				networkIdentifier:
					transferSecondSignatureFixture.testCases.input.networkIdentifier,
			});
			newTransaction.sign(
				transferSecondSignatureFixture.testCases.input.account.passphrase,
				transferSecondSignatureFixture.testCases.input.secondPassphrase,
			);

			const stringifiedTransaction = newTransaction.stringify();
			const parsedResponse = JSON.parse(stringifiedTransaction);

			expect(parsedResponse.senderPublicKey).to.be.eql(
				transferSecondSignatureFixture.testCases.output.senderPublicKey,
			);
			expect(parsedResponse.signature).to.be.eql(
				transferSecondSignatureFixture.testCases.output.signature,
			);
			expect(parsedResponse.signSignature).to.be.eql(
				transferSecondSignatureFixture.testCases.output.signSignature,
			);
		});
	});

	describe('#sign', () => {
		const defaultPassphrase = 'passphrase';
		const defaultSecondPassphrase = 'second-passphrase';
		const defaultHash = Buffer.from(
			'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02111111',
			'hex',
		);
		const defaultSecondHash = Buffer.from(
			'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c679324300000000000000000000000000000000',
			'hex',
		);
		const defaultSignature =
			'dc8fe25f817c81572585b3769f3c6df13d3dc93ff470b2abe807f43a3359ed94e9406d2539013971431f2d540e42dc7d3d71c7442da28572c827d59adc5dfa08';
		const defaultSecondSignature =
			'2092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309';

		let signDataStub: SinonStub;

		beforeEach(async () => {
			const hashStub = sandbox
				.stub(cryptography, 'hash')
				.onFirstCall()
				.returns(defaultHash)
				.onSecondCall()
				.returns(defaultSecondHash);
			hashStub.returns(defaultHash);
			signDataStub = sandbox
				.stub(cryptography, 'signData')
				.onFirstCall()
				.returns(defaultSignature)
				.onSecondCall()
				.returns(defaultSecondSignature);
		});

		describe('when sign is called with passphrase', () => {
			beforeEach(async () => {
				transactionWithDefaultValues.sign(defaultPassphrase);
			});

			it('should set signature property', async () => {
				expect(transactionWithDefaultValues.signature).to.equal(
					defaultSignature,
				);
			});

			it('should not set signSignature property', async () => {
				expect(transactionWithDefaultValues.signSignature).to.be.undefined;
			});

			it('should set id property', async () => {
				expect(transactionWithDefaultValues.id).not.to.be.empty;
			});

			it('should set senderId property', async () => {
				expect(transactionWithDefaultValues.senderId).not.to.be.empty;
			});

			it('should set senderPublicKey property', async () => {
				expect(transactionWithDefaultValues.senderPublicKey).not.to.be.empty;
			});

			it('should call signData with the hash result and the passphrase', async () => {
				expect(signDataStub).to.be.calledWithExactly(
					defaultHash,
					defaultPassphrase,
				);
			});
		});

		describe('when sign is called with passphrase and second passphrase', () => {
			beforeEach(async () => {
				transactionWithDefaultValues.sign(
					defaultPassphrase,
					defaultSecondPassphrase,
				);
			});

			it('should set signature property', async () => {
				expect(transactionWithDefaultValues.signature).to.equal(
					defaultSignature,
				);
			});

			it('should set signSignature property', async () => {
				expect(transactionWithDefaultValues.signSignature).to.equal(
					defaultSecondSignature,
				);
			});

			it('should set id property', async () => {
				expect(transactionWithDefaultValues.id).not.to.be.empty;
			});

			it('should set senderId property', async () => {
				expect(transactionWithDefaultValues.senderId).not.to.be.empty;
			});

			it('should set senderPublicKey property', async () => {
				expect(transactionWithDefaultValues.senderPublicKey).not.to.be.empty;
			});

			it('should call signData with the hash result and the passphrase', async () => {
				expect(signDataStub).to.be.calledWithExactly(
					defaultHash,
					defaultPassphrase,
				);
			});

			it('should call signData with the hash result and the passphrase', async () => {
				expect(signDataStub).to.be.calledWithExactly(
					defaultSecondHash,
					defaultSecondPassphrase,
				);
			});
		});
	});
});
