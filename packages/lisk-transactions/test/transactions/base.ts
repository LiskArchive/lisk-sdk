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
import { BaseTransaction } from '../../src/transactions/base';
import { TransactionJSON, Status, Account } from '../../src/transaction_types';
import { TransactionError, TransactionMultiError } from '../../src/errors';
import BigNum from 'browserify-bignum';
import { addDate, TestTransaction } from '../helpers';
import {
	validAccount as defaultSenderAccount,
	validMultisignatureAccount as defaultMultisignatureAccount,
	validMultisignatureTransaction,
	validTransaction,
	validSecondSignatureAccount as defaultSecondSignatureAccount,
	validSecondSignatureTransaction,
} from '../../fixtures';

describe('Base transaction class', () => {
	const defaultTransaction = addDate(validTransaction);
	const defaultSecondSignatureTransaction = addDate(
		validSecondSignatureTransaction,
	);
	const defaultMultisignatureTransaction = addDate(
		validMultisignatureTransaction,
	);

	let baseTransaction: BaseTransaction;

	beforeEach(async () => {
		baseTransaction = new TestTransaction(defaultTransaction);
	});

	describe('#constructor', () => {
		it('should create a new instance of BaseTransaction', async () => {
			expect(baseTransaction)
				.to.be.an('object')
				.and.be.instanceof(BaseTransaction);
		});

		it('should have amount of type BigNum', async () => {
			expect(baseTransaction)
				.to.have.property('amount')
				.and.be.instanceof(BigNum);
		});

		it('should have fee of type BigNum', async () => {
			expect(baseTransaction)
				.to.have.property('fee')
				.and.be.instanceof(BigNum);
		});

		it('should have id string', async () => {
			expect(baseTransaction)
				.to.have.property('id')
				.and.be.a('string');
		});

		it('should have recipientId string', async () => {
			expect(baseTransaction)
				.to.have.property('recipientId')
				.and.be.a('string');
		});

		it('should have recipientPublicKey string', async () => {
			expect(baseTransaction)
				.to.have.property('recipientPublicKey')
				.and.be.a('string');
		});

		it('should have senderId string', async () => {
			expect(baseTransaction)
				.to.have.property('senderId')
				.and.be.a('string');
		});

		it('should have senderPublicKey string', async () => {
			expect(baseTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signature string', async () => {
			expect(baseTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signSignature string', async () => {
			expect(baseTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signatures array', async () => {
			expect(baseTransaction)
				.to.have.property('signatures')
				.and.be.a('array');
		});

		it('should have timestamp number', async () => {
			expect(baseTransaction)
				.to.have.property('timestamp')
				.and.be.a('number');
		});

		it('should have type number', async () => {
			expect(baseTransaction)
				.to.have.property('type')
				.and.be.a('number');
		});

		it('should have receivedAt Date', async () => {
			expect(baseTransaction)
				.to.have.property('type')
				.and.be.a('number');
		});

		it('should have isMultisignature boolean', async () => {
			expect(baseTransaction)
				.to.have.property('isMultisignature')
				.and.be.a('boolean');
		});

		it('should set isMultisignature to true with a multisignature transaction', async () => {
			const multisignatureTestTransaction = new TestTransaction(
				defaultMultisignatureTransaction,
			);
			expect(multisignatureTestTransaction.isMultisignature).to.be.true;
		});

		it('should set isMultisignature to false with non-multisignature transaction', async () => {
			expect(baseTransaction.isMultisignature).to.be.false;
		});

		it('should throw a transaction multierror with an incorrectly typed transaction', async () => {
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
			expect(baseTransaction.assetToJSON()).to.be.an('object');
		});
	});

	describe('#toJSON', () => {
		it('should return transaction json', async () => {
			const transactionJSON = baseTransaction.toJSON();

			expect(transactionJSON).to.be.eql(defaultTransaction);
		});
	});

	describe('#getBytes', () => {
		it('should return a buffer', async () => {
			expect(baseTransaction.getBytes()).to.be.an.instanceOf(Buffer);
		});
	});

	describe('#containsUniqueData', () => {
		it('should return a boolean', async () => {
			expect(baseTransaction.containsUniqueData()).to.be.a('boolean');
		});
	});

	describe('#checkSchema', () => {
		it('should return a successful transaction response with a valid transaction', async () => {
			const { id, status, errors } = baseTransaction.checkSchema();

			expect(id).to.be.eql(baseTransaction.id);
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
			const { id, status, errors } = invalidTestTransaction.checkSchema();

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
			} = invalidSenderIdTestTransaction.checkSchema();

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
			const { id, status, errors } = invalidIdTestTransaction.checkSchema();

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
				.stub(baseTransaction, 'getBytes')
				.returns(
					Buffer.from(
						'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b020000002092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
					),
				);
		});

		it('should return a successful transaction response with a valid transaction', async () => {
			const { id, status, errors } = baseTransaction.validate();

			expect(id).to.be.eql(baseTransaction.id);
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
		it('should return an object with property `ACCOUNTS` containing address of sender', async () => {
			const expectedAddressArray = ['18278674964748191682L'];
			const requiredAttributes: any = baseTransaction.getRequiredAttributes();
			expect(requiredAttributes)
				.to.be.an('object')
				.and.to.have.property('ACCOUNTS');

			expect(requiredAttributes['ACCOUNTS']).to.be.eql(expectedAddressArray);
		});
	});

	describe('#verify', () => {
		it('should return a successful transaction response with valid transaction', async () => {
			const { id, status, errors } = baseTransaction.verify(
				defaultSenderAccount,
			);

			expect(id).to.be.eql(baseTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});

		it('should return a failed transaction response when account publicKey does not match transaction', async () => {
			const invalidPublicKeyAccount = {
				...defaultSenderAccount,
				publicKey: defaultSenderAccount.publicKey.replace('0', '1'),
			};
			const { id, status, errors } = baseTransaction.verify(
				invalidPublicKeyAccount,
			);

			expect(id).to.be.eql(baseTransaction.id);
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
			const { id, status, errors } = baseTransaction.verify(
				invalidAddressAccount,
			);

			expect(id).to.be.eql(baseTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', 'Invalid sender address');
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response when account is missing secondPublicKey', async () => {
			const secondSignatureTestTransaction = new TestTransaction(
				defaultSecondSignatureTransaction,
			);
			const {
				secondPublicKey,
				...invalidSecondPublicKeySenderAccount
			} = defaultSecondSignatureAccount;
			const { id, status, errors } = secondSignatureTestTransaction.verify(
				invalidSecondPublicKeySenderAccount,
			);

			expect(id).to.be.eql(secondSignatureTestTransaction.id);
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
			const { id, status, errors } = baseTransaction.verify(
				insufficientBalanceAccount,
			);

			expect(id).to.be.eql(baseTransaction.id);
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
			const secondSignatureTestTransaction = new TestTransaction(
				defaultSecondSignatureTransaction,
			);
			const senderAccount = {
				...defaultSecondSignatureAccount,
				secondPublicKey: defaultTransaction.senderPublicKey.replace('1', '0'),
			};
			const { id, status, errors } = secondSignatureTestTransaction.verify(
				senderAccount,
			);

			expect(id).to.be.eql(secondSignatureTestTransaction.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Failed to verify signature ${
						secondSignatureTestTransaction.signSignature
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
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Failed to verify signature ${defaultMultisignatureTransaction.signatures[0].replace(
						'1',
						'0',
					)}`,
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
			} = baseTransaction.verifyAgainstOtherTransactions(otherTransactions);
			expect(id).to.be.eql(baseTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});
	});

	describe('#apply', () => {
		it('should return an updated sender account with balance minus transaction fee', async () => {
			const { state } = baseTransaction.apply(defaultSenderAccount);
			expect(state).to.be.an('array');
			const appliedState = state as ReadonlyArray<Account>;
			expect(appliedState[0])
				.to.be.an('object')
				.and.to.have.property('balance', '0');
		});
	});

	describe('#undo', () => {
		it('should return sender account with original balance', async () => {
			const { state: returnedState } = baseTransaction.apply(
				defaultSenderAccount,
			);
			const appliedStateArray = returnedState as ReadonlyArray<Account>;
			const appliedState = appliedStateArray[0];
			const { state: secondReturnedState } = baseTransaction.undo(
				appliedState as Account,
			);
			const undoneState = secondReturnedState as ReadonlyArray<Account>;
			expect(undoneState).to.be.an('array');
			expect(undoneState[0])
				.to.be.an('object')
				.and.to.have.property('balance', '10000000');
		});
	});

	describe('#isExpired', () => {
		describe('when transaction is not expired', async () => {
			beforeEach(async () => {
				let expiredTransaction = {
					...defaultTransaction,
					receivedAt: new Date(),
				};
				baseTransaction = new TestTransaction(expiredTransaction);
			});

			it('should return false', async () => {
				expect(baseTransaction.isExpired(new Date())).to.be.false;
			});
		});

		describe('when transaction is expired', async () => {
			beforeEach(() => {
				let expiredTransaction = {
					...defaultTransaction,
					receivedAt: new Date(+new Date() - 1300 * 60000),
				};
				baseTransaction = new TestTransaction(expiredTransaction);
			});

			it('should return true', async () => {
				expect(baseTransaction.isExpired(new Date())).to.be.true;
			});
		});
	});
});
