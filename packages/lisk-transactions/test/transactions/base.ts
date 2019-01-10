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
 *
 */
import { expect } from 'chai';
import * as cryptography from '@liskhq/lisk-cryptography';
import { BYTESIZES, MAX_TRANSACTION_AMOUNT } from '../../src/constants';
import {
	BaseTransaction,
	MultisignatureStatus,
} from '../../src/transactions/base';
import { TransactionJSON, Status } from '../../src/transaction_types';
import { TransactionError, TransactionMultiError } from '../../src/errors';
import BigNum from 'browserify-bignum';
import { addTransactionFields, TestTransaction } from '../helpers';
import {
	validAccount as defaultSenderAccount,
	validMultisignatureAccount as defaultMultisignatureAccount,
	validMultisignatureTransaction,
	validTransaction,
	validSecondSignatureAccount as defaultSecondSignatureAccount,
	validSecondSignatureTransaction,
} from '../../fixtures';
import * as utils from '../../src/utils';
import { SinonStub } from 'sinon';

describe('Base transaction class', () => {
	const defaultTransaction = addTransactionFields(validTransaction);
	const defaultSecondSignatureTransaction = addTransactionFields(
		validSecondSignatureTransaction,
	);
	const defaultMultisignatureTransaction = addTransactionFields(
		validMultisignatureTransaction,
	);

	let validTestTransaction: BaseTransaction;
	let validSecondSignatureTestTransaction: BaseTransaction;
	let validMultisignatureTestTransaction: BaseTransaction;

	beforeEach(async () => {
		validTestTransaction = new TestTransaction(defaultTransaction);
		validSecondSignatureTestTransaction = new TestTransaction(
			defaultSecondSignatureTransaction,
		);
		validMultisignatureTestTransaction = new TestTransaction(
			defaultMultisignatureTransaction,
		);
	});

	describe('#constructor', () => {
		it('should create a new instance of BaseTransaction', async () => {
			expect(validTestTransaction)
				.to.be.an('object')
				.and.be.instanceof(BaseTransaction);
		});

		it('should have amount of type BigNum', async () => {
			expect(validTestTransaction)
				.to.have.property('amount')
				.and.be.instanceof(BigNum);
		});

		it('should have fee of type BigNum', async () => {
			expect(validTestTransaction)
				.to.have.property('fee')
				.and.be.instanceof(BigNum);
		});

		it('should have id string', async () => {
			expect(validTestTransaction)
				.to.have.property('id')
				.and.be.a('string');
		});

		it('should have recipientId string', async () => {
			expect(validTestTransaction)
				.to.have.property('recipientId')
				.and.be.a('string');
		});

		it('should have recipientPublicKey string', async () => {
			expect(validTestTransaction)
				.to.have.property('recipientPublicKey')
				.and.be.a('string');
		});

		it('should have senderId string', async () => {
			expect(validTestTransaction)
				.to.have.property('senderId')
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
				.to.have.property('type')
				.and.be.a('number');
		});

		it('should have isMultisignature boolean', async () => {
			expect(validTestTransaction).to.have.property('isMultisignature');
		});

		it('should set isMultisignature to unknown', async () => {
			expect(validMultisignatureTestTransaction.isMultisignature).to.eql(
				MultisignatureStatus.UNKNOWN,
			);
		});

		it('should throw a transaction multierror with incorrectly typed transaction properties', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				amount: 0,
				fee: 10,
			};
			try {
				new TestTransaction((invalidTransaction as unknown) as TransactionJSON);
			} catch (error) {
				expect(error).to.be.an.instanceOf(TransactionMultiError);
			}
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

			expect(transactionJSON).to.be.eql(defaultTransaction);
		});
	});

	describe('#getAssetBytes', () => {
		it('should return a buffer', async () => {
			expect(
				(validTestTransaction as TestTransaction).getAssetBytes(),
			).to.be.an.instanceOf(Buffer);
		});
	});

	describe('#getBasicBytes', () => {
		it('should call cryptography hexToBuffer', async () => {
			const cryptographyHexToBufferStub = sandbox
				.stub(cryptography, 'hexToBuffer')
				.returns(
					Buffer.from(
						'62b13b81836f3f1e371eba2f7f8306ff23d00a87d9473793eda7f742f4cfc21c',
						'hex',
					),
				);
			(validTestTransaction as any).getBasicBytes();

			expect(cryptographyHexToBufferStub).to.be.calledWithExactly(
				defaultTransaction.senderPublicKey,
			);
		});

		it('should call cryptography bigNumberToBuffer for non-empty recipientId', async () => {
			const cryptographyBigNumberToBufferStub = sandbox
				.stub(cryptography, 'bigNumberToBuffer')
				.returns(
					Buffer.from(defaultTransaction.recipientId.slice(0, -1), 'hex'),
				);
			(validTestTransaction as any).getBasicBytes();

			expect(cryptographyBigNumberToBufferStub).to.be.calledWithExactly(
				defaultTransaction.recipientId.slice(0, -1),
				BYTESIZES.RECIPIENT_ID,
			);
		});

		it('should call getAssetBytes for transaction with asset', async () => {
			const transactionWithAsset = {
				...defaultTransaction,
				asset: { data: 'data' },
			};
			const testTransactionWithAsset = new TestTransaction(
				transactionWithAsset,
			);
			const getAssetBytesStub = sandbox
				.stub(testTransactionWithAsset, 'getAssetBytes')
				.returns(Buffer.from('data'));
			(testTransactionWithAsset as any).getBasicBytes();

			expect(getAssetBytesStub).to.be.calledOnce;
		});

		it('should return a buffer without signatures bytes', async () => {
			const expectedBuffer = Buffer.from(
				'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
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
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
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
				'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b020000002092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
				'hex',
			);

			expect(validTestTransaction.getBytes()).to.eql(expectedBuffer);
		});

		it('should return a buffer with signSignature bytes', async () => {
			const expectedBuffer = Buffer.from(
				'004529cf04bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8b95af897b7e23cb900e40b54020000003357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e0111f77b8596df14400f5dd5cf9ef9bd2a20f66a48863455a163cabc0c220ea235d8b98dec684bd86f62b312615e7f64b23d7b8699775e7c15dad0aef0abd4f503',
				'hex',
			);

			expect(validSecondSignatureTestTransaction.getBytes()).to.eql(
				expectedBuffer,
			);
		});
	});

	describe('#validateSchema', () => {
		it('should call toJSON', async () => {
			const toJSONStub = sandbox
				.stub(validTestTransaction, 'toJSON')
				.returns({});
			validTestTransaction.validateSchema();

			expect(toJSONStub).to.be.calledOnce;
		});

		it('should call cryptography getAddressFromPublicKey for transaction with valid senderPublicKey', async () => {
			const cryptographyGetAddressFromPublicKeyStub = sandbox
				.stub(cryptography, 'getAddressFromPublicKey')
				.returns('18278674964748191682L');
			validTestTransaction.validateSchema();

			expect(
				cryptographyGetAddressFromPublicKeyStub,
			).to.have.been.calledWithExactly(validTestTransaction.senderPublicKey);
		});

		it('should call getBytes', async () => {
			const getBytesStub = sandbox
				.stub(validTestTransaction, 'getBytes')
				.returns(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
						'hex',
					),
				);
			validTestTransaction.validateSchema();
			expect(getBytesStub).to.be.calledOnce;
		});

		it('should call getId', async () => {
			const getIdStub = sandbox
				.stub(utils, 'getId')
				.returns('15822870279184933850');
			validTestTransaction.validateSchema();

			expect(getIdStub).to.be.calledOnce;
		});

		it('should return a successful transaction response with a valid transaction', async () => {
			const { id, status, errors } = validTestTransaction.validateSchema();

			expect(id).to.be.eql(validTestTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});

		it('should return a failed transaction response with invalid formatting', async () => {
			const invalidTransaction = {
				type: 0,
				amount: '00001',
				fee: '0000',
				recipientId: '',
				senderPublicKey: '11111111',
				senderId: '11111111',
				timestamp: 79289378,
				asset: {},
				signature: '1111111111',
				id: '1',
			};
			const invalidTestTransaction = new TestTransaction(
				invalidTransaction as any,
			);
			const { id, status, errors } = invalidTestTransaction.validateSchema();

			expect(id).to.be.eql(invalidTestTransaction.id);
			(errors as ReadonlyArray<TransactionError>).forEach(error =>
				expect(error).to.be.instanceof(TransactionError),
			);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with unmatching senderId and senderPublicKey', async () => {
			const invalidSenderIdTransaction = {
				...defaultTransaction,
				senderId: defaultTransaction.senderId.replace('1', '0'),
			};
			const invalidSenderIdTestTransaction = new TestTransaction(
				invalidSenderIdTransaction as any,
			);
			const {
				id,
				status,
				errors,
			} = invalidSenderIdTestTransaction.validateSchema();

			expect(id).to.be.eql(invalidSenderIdTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[1])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					'`senderId` does not match `senderPublicKey`',
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with an invalid id', async () => {
			const invalidIdTransaction = {
				...defaultTransaction,
				id: defaultTransaction.id.replace('1', '0'),
			};

			const invalidIdTestTransaction = new TestTransaction(
				invalidIdTransaction as any,
			);
			const { id, status, errors } = invalidIdTestTransaction.validateSchema();

			expect(id).to.be.eql(invalidIdTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', 'Invalid transaction id');
			expect(status).to.eql(Status.FAIL);
		});
	});

	describe('#validate', () => {
		beforeEach(async () => {
			sandbox
				.stub(validTestTransaction, 'getBytes')
				.returns(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b020000002092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
					),
				);
		});

		it('should call getBasicBytes', async () => {
			const getBasicBytesStub = sandbox
				.stub(validTestTransaction as any, 'getBasicBytes')
				.returns(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
						'hex',
					),
				);
			validTestTransaction.validate();

			expect(getBasicBytesStub).to.be.calledOnce;
		});

		it('should call verifySignature', async () => {
			const verifySignatureStub = sandbox
				.stub(utils, 'verifySignature')
				.returns(true);
			validTestTransaction.validate();

			expect(verifySignatureStub).to.be.calledWithExactly(
				validTestTransaction.senderPublicKey,
				validTestTransaction.signature,
				Buffer.from(
					'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
					'hex',
				),
				validTestTransaction.id,
			);
		});

		it('should return a successful transaction response with a valid transaction', async () => {
			const { id, status, errors } = validTestTransaction.validate();

			expect(id).to.be.eql(validTestTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});

		it('should return a failed transaction response with invalid signature', async () => {
			const invalidSignature = defaultTransaction.signature.replace('1', '0');
			const invalidSignatureTransaction = {
				...defaultTransaction,
				signature: invalidSignature,
			};
			const invalidSignatureTestTransaction = new TestTransaction(
				invalidSignatureTransaction as any,
			);
			const { id, status, errors } = invalidSignatureTestTransaction.validate();

			expect(id).to.be.eql(invalidSignatureTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Failed to verify signature ${invalidSignature}`,
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
				.and.to.have.property(
					'message',
					'Encountered duplicate signature in transaction',
				);
			expect(status).to.eql(Status.FAIL);
		});
	});

	describe('#getRequiredAttributes', () => {
		it('should call cryptography getAddressFromPublicKey', async () => {
			const cryptographyGetAddressFromPublicKeyStub = sandbox
				.stub(cryptography, 'getAddressFromPublicKey')
				.returns('18278674964748191682L');
			validTestTransaction.validateSchema();

			expect(
				cryptographyGetAddressFromPublicKeyStub,
			).to.have.been.calledWithExactly(validTestTransaction.senderPublicKey);
		});

		it('should return an object with property `ACCOUNTS` containing an array with address of sender', async () => {
			const expectedAddressArray = ['18278674964748191682L'];
			const requiredAttributes: any = validTestTransaction.getRequiredAttributes();
			expect(requiredAttributes)
				.to.be.an('object')
				.and.to.have.property('ACCOUNTS');

			expect(requiredAttributes['ACCOUNTS']).to.be.eql(expectedAddressArray);
		});
	});

	describe('#verify', () => {
		it('should call verifyBalance', async () => {
			const verifyBalanceStub = sandbox
				.stub(utils, 'verifyBalance')
				.returns(true);
			validTestTransaction.verify(defaultSenderAccount);

			expect(verifyBalanceStub).to.be.calledWithExactly(
				defaultSenderAccount,
				validTestTransaction.fee,
			);
		});

		it('should call verifySignature for second signature transaction', async () => {
			const verifySignatureStub = sandbox
				.stub(utils, 'verifySignature')
				.returns(true);
			validSecondSignatureTestTransaction.verify(defaultSecondSignatureAccount);

			expect(verifySignatureStub).to.be.calledWithExactly(
				defaultSecondSignatureAccount.secondPublicKey,
				validSecondSignatureTestTransaction.signSignature,
				Buffer.from(
					'004529cf04bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8b95af897b7e23cb900e40b54020000003357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e01',
					'hex',
				),
				validSecondSignatureTestTransaction.id,
			);
		});

		it('should call getBasicBytes for multisignature transaction', async () => {
			const getBasicBytesStub = sandbox
				.stub(validMultisignatureTestTransaction as any, 'getBasicBytes')
				.returns(
					Buffer.from(
						'00de46a00424193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d3c9ea25a6b7c648f00e1f50500000000746865207265616c2074657374',
						'hex',
					),
				);
			validMultisignatureTestTransaction.verify(defaultMultisignatureAccount);

			expect(getBasicBytesStub).to.be.calledOnce;
		});

		it('should call verifyMultisignatures for multisignature transaction', async () => {
			const verifyMultisignaturesStub = sandbox
				.stub(utils, 'verifyMultisignatures')
				.returns(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
						'hex',
					),
				);
			validMultisignatureTestTransaction.verify(defaultMultisignatureAccount);

			expect(verifyMultisignaturesStub).to.be.calledWithExactly(
				defaultMultisignatureAccount.multisignatures,
				defaultMultisignatureTransaction.signatures,
				defaultMultisignatureAccount.multimin,
				Buffer.from(
					'00de46a00424193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d3c9ea25a6b7c648f00e1f50500000000',
					'hex',
				),
				validMultisignatureTestTransaction.id,
			);
		});

		it('should set isMultisignature to true for multisignature account', async () => {
			validTestTransaction.verify(defaultMultisignatureAccount);
			expect(validTestTransaction.isMultisignature).to.eql(
				MultisignatureStatus.TRUE,
			);
		});

		it('should set isMultisignature to false for non-multisignature account', async () => {
			validTestTransaction.verify(defaultSenderAccount);
			expect(validTestTransaction.isMultisignature).to.eql(
				MultisignatureStatus.FALSE,
			);
		});

		it('should return a successful transaction response with valid transaction', async () => {
			const { id, status, errors } = validTestTransaction.verify(
				defaultSenderAccount,
			);

			expect(id).to.be.eql(validTestTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});

		it('should return a failed transaction response with invalid account publicKey', async () => {
			const invalidPublicKeyAccount = {
				...defaultSenderAccount,
				publicKey: defaultSenderAccount.publicKey.replace('0', '1'),
			};
			const { id, status, errors } = validTestTransaction.verify(
				invalidPublicKeyAccount,
			);

			expect(id).to.be.eql(validTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', 'Invalid sender publicKey');
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with invalid account address', () => {
			const invalidAddressAccount = {
				...defaultSenderAccount,
				address: defaultSenderAccount.address.replace('1', '0'),
			};
			const { id, status, errors } = validTestTransaction.verify(
				invalidAddressAccount,
			);

			expect(id).to.be.eql(validTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', 'Invalid sender address');
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response when account is missing secondPublicKey', async () => {
			const {
				secondPublicKey,
				...invalidSecondPublicKeySenderAccount
			} = defaultSecondSignatureAccount;
			const { id, status, errors } = validSecondSignatureTestTransaction.verify(
				invalidSecondPublicKeySenderAccount,
			);

			expect(id).to.be.eql(validSecondSignatureTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					'Sender does not have a secondPublicKey',
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response when account has insufficient balance', async () => {
			const insufficientBalanceAccount = {
				...defaultSenderAccount,
				balance: '0',
			};
			const { id, status, errors } = validTestTransaction.verify(
				insufficientBalanceAccount,
			);

			expect(id).to.be.eql(validTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					'Account does not have enough LSK: 18278674964748191682L balance: 0',
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response when transaction is missing signSignature', async () => {
			const {
				signSignature,
				...invalidSignSignatureTransaction
			} = defaultSecondSignatureTransaction;

			const invalidSecondSignatureTestTransaction = new TestTransaction(
				invalidSignSignatureTransaction,
			);

			const {
				id,
				status,
				errors,
			} = invalidSecondSignatureTestTransaction.verify(
				defaultSecondSignatureAccount,
			);

			expect(id).to.be.eql(invalidSecondSignatureTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', 'Missing signSignature');
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response when transaction signSignature is invalid', async () => {
			const invalidSignSignatureTransaction = {
				...defaultSecondSignatureTransaction,
				signSignature: defaultSecondSignatureTransaction.signSignature.replace(
					'0',
					'1',
				),
			};
			const invalidSignSignatureTestTransaction = new TestTransaction(
				invalidSignSignatureTransaction,
			);
			const { id, status, errors } = invalidSignSignatureTestTransaction.verify(
				defaultSecondSignatureAccount,
			);

			expect(id).to.be.eql(invalidSignSignatureTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					'Failed to verify signature 11f77b8596df14410f5dd5cf9ef9bd2a20f66a48863455a163cabc0c220ea235d8b98dec684bd86f62b312615e7f64b23d7b8699775e7c15dad0aef0abd4f503',
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with an invalid secondPublicKey', async () => {
			const invalidSecondPublicKeyAccount = {
				...defaultSecondSignatureAccount,
				secondPublicKey: defaultTransaction.senderPublicKey.replace('1', '0'),
			};
			const { id, status, errors } = validSecondSignatureTestTransaction.verify(
				invalidSecondPublicKeyAccount,
			);

			expect(id).to.be.eql(validSecondSignatureTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Failed to verify signature ${
						validSecondSignatureTestTransaction.signSignature
					}`,
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with invalid multisignatures', async () => {
			const multisignatureTransaction = {
				...defaultMultisignatureTransaction,
				signatures: defaultMultisignatureTransaction.signatures.map(
					(signature: string) => signature.replace('1', '0'),
				),
			};
			const invalidSignaturesTransaction = new TestTransaction(
				multisignatureTransaction,
			);
			const { id, status, errors } = invalidSignaturesTransaction.verify(
				defaultMultisignatureAccount,
			);

			expect(id).to.be.eql(invalidSignaturesTransaction.id);
			(errors as ReadonlyArray<TransactionError>).forEach((error, i) =>
				expect(error)
					.to.be.instanceof(TransactionError)
					.and.to.have.property(
						'message',
						`Failed to verify signature ${defaultMultisignatureTransaction.signatures[
							i
						].replace('1', '0')}`,
					),
			);
			expect(status).to.eql(Status.FAIL);
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
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});
	});

	describe('#apply', () => {
		it('should return a successful transaction response with an updated sender account', async () => {
			const { id, status, state, errors } = validTestTransaction.apply(
				defaultSenderAccount,
			);
			expect(id).to.be.eql(validTestTransaction.id);
			expect(status).to.eql(Status.OK);
			expect(state)
				.to.be.an('object')
				.and.to.have.property('sender');
			expect((state as any).sender).to.have.property('balance', '0');
			expect(errors).to.be.eql([]);
		});

		it('should return a failed transaction response with insufficient account balance', async () => {
			const { id, status, state, errors } = validTestTransaction.apply({
				...defaultSenderAccount,
				balance: '0',
			});

			expect(id).to.be.eql(validTestTransaction.id);
			expect(status).to.eql(Status.FAIL);
			expect(state)
				.to.be.an('object')
				.and.to.have.property('sender');
			expect((state as any).sender).to.have.property('balance', '-10000000');
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Account does not have enough LSK: ${
						defaultSenderAccount.address
					}, balance: 0`,
				);
		});
	});

	describe('#undo', () => {
		it('should return a successful transaction response with an updated sender account', async () => {
			const { id, status, state, errors } = validTestTransaction.undo(
				defaultSenderAccount,
			);
			expect(id).to.be.eql(validTestTransaction.id);
			expect(status).to.eql(Status.OK);
			expect(state)
				.to.be.an('object')
				.and.to.have.property('sender');
			expect((state as any).sender).to.have.property('balance', '20000000');
			expect(errors).to.be.eql([]);
		});

		it('should return a failed transaction response with account balance exceeding max amount', async () => {
			const { id, status, state, errors } = validTestTransaction.undo({
				...defaultSenderAccount,
				balance: MAX_TRANSACTION_AMOUNT.toString(),
			});
			expect(id).to.be.eql(validTestTransaction.id);
			expect(status).to.eql(Status.FAIL);
			expect(state)
				.to.be.an('object')
				.and.to.have.property('sender');
			expect((state as any).sender).to.have.property(
				'balance',
				new BigNum(MAX_TRANSACTION_AMOUNT)
					.add(validTestTransaction.fee)
					.toString(),
			);
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
				receivedAt: new Date(),
			};
			const expiredTransaction = {
				...defaultTransaction,
				receivedAt: new Date(+new Date() - 1300 * 60000),
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

	describe('#sign', () => {
		const defaultPassphrase = 'passphrase';
		const defaultSecondPassphrase = 'second-passphrase';
		const defaultHash = Buffer.from(
			'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02111111',
			'hex',
		);
		const defaultSecondHash = Buffer.from(
			'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
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
				validTestTransaction.sign(defaultPassphrase);
			});

			it('should set signature property', async () => {
				expect(validTestTransaction.signature).to.equal(defaultSignature);
			});

			it('should not set signSignature property', async () => {
				expect(validTestTransaction.signSignature).to.be.undefined;
			});

			it('should set id property', async () => {
				expect(validTestTransaction.id).not.to.be.empty;
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
				validTestTransaction.sign(defaultPassphrase, defaultSecondPassphrase);
			});

			it('should set signature property', async () => {
				expect(validTestTransaction.signature).to.equal(defaultSignature);
			});

			it('should set signSignature property', async () => {
				expect(validTestTransaction.signSignature).to.equal(
					defaultSecondSignature,
				);
			});

			it('should set id property', async () => {
				expect(validTestTransaction.id).not.to.be.empty;
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
