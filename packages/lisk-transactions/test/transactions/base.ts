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
import { TestTransaction } from '../helpers/test_transaction_class';

describe('Base transaction class', () => {
	const defaultSignature =
		'2092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309';
	const defaultTransaction: TransactionJSON = {
		id: '15822870279184933850',
		type: 0,
		timestamp: 79289378,
		senderPublicKey:
			'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243',
		senderId: '18278674964748191682L',
		recipientId: '17243547555692708431L',
		recipientPublicKey:
			'3f82af600f7507a5c95e8a1c2b69aa353b59f26906298dce1d8009a2a52c6f59',
		amount: '9312934243',
		fee: '10000000',
		signature: defaultSignature,
		signSignature: undefined,
		signatures: [],
		asset: {},
		receivedAt: new Date(),
	};

	const defaultSenderAccount = {
		address: '18278674964748191682L',
		balance: '10000000',
		publicKey:
			'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243',
		secondPublicKey: '',
	};

	const defaultSecondSignatureTransaction = {
		amount: '10000000000',
		recipientId: '13356260975429434553L',
		senderId: '10582186986223407633L',
		senderPublicKey:
			'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8',
		timestamp: 80685381,
		type: 0,
		fee: '10000000',
		recipientPublicKey: '',
		asset: {},
		signature:
			'3357658f70b9bece24bd42769b984b3e7b9be0b2982f82e6eef7ffbd841598d5868acd45f8b1e2f8ab5ccc8c47a245fe9d8e3dc32fc311a13cc95cc851337e01',
		signatures: [],
		signSignature:
			'11f77b8596df14400f5dd5cf9ef9bd2a20f66a48863455a163cabc0c220ea235d8b98dec684bd86f62b312615e7f64b23d7b8699775e7c15dad0aef0abd4f503',
		id: '11638517642515821734',
		receivedAt: new Date(),
	};

	const defaultSecondSignatureAccount = {
		address: '10582186986223407633L',
		balance: '9500000000',
		publicKey:
			'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8',
		secondPublicKey:
			'bc10685b802c8dd127e5d78faadc9fad1903f09d562fdcf632462408d4ba52e8',
	};

	let baseTransaction: BaseTransaction;

	beforeEach(() => {
		baseTransaction = new TestTransaction(defaultTransaction);
	});

	describe('#constructor', () => {
		it('should create a new instance of BaseTransaction', () => {
			return expect(baseTransaction)
				.to.be.an('object')
				.and.be.instanceof(BaseTransaction);
		});

		it('should have amount of type BigNum', () => {
			return expect(baseTransaction)
				.to.have.property('amount')
				.and.be.instanceof(BigNum);
		});

		it('should have fee of type BigNum', () => {
			return expect(baseTransaction)
				.to.have.property('fee')
				.and.be.instanceof(BigNum);
		});

		it('should have id string', () => {
			return expect(baseTransaction)
				.to.have.property('id')
				.and.be.a('string');
		});

		it('should have recipientId string', () => {
			return expect(baseTransaction)
				.to.have.property('recipientId')
				.and.be.a('string');
		});

		it('should have recipientPublicKey string', () => {
			return expect(baseTransaction)
				.to.have.property('recipientPublicKey')
				.and.be.a('string');
		});

		it('should have senderId string', () => {
			return expect(baseTransaction)
				.to.have.property('senderId')
				.and.be.a('string');
		});

		it('should have senderPublicKey string', () => {
			return expect(baseTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signature string', () => {
			return expect(baseTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signSignature string', () => {
			return expect(baseTransaction)
				.to.have.property('senderPublicKey')
				.and.be.a('string');
		});

		it('should have signatures array', () => {
			return expect(baseTransaction)
				.to.have.property('signatures')
				.and.be.a('array');
		});

		it('should have timestamp number', () => {
			return expect(baseTransaction)
				.to.have.property('timestamp')
				.and.be.a('number');
		});

		it('should have type number', () => {
			return expect(baseTransaction)
				.to.have.property('type')
				.and.be.a('number');
		});

		it('should have receivedAt Date', () => {
			return expect(baseTransaction)
				.to.have.property('type')
				.and.be.a('number');
		});

		it('should have isMultisignature boolean', () => {
			return expect(baseTransaction)
				.to.have.property('isMultisignature')
				.and.be.a('boolean');
		});

		describe('when transaction has empty `signatures`', () => {
			it('should set isMultisignature to false', () => {
				return expect(baseTransaction.isMultisignature).to.be.false;
			});
		});

		describe('when transaction has non-empty `signatures`', () => {
			beforeEach(() => {
				const multisignatureTransaction = {
					...defaultTransaction,
					signatures: [defaultSignature, defaultSignature],
				};
				baseTransaction = new TestTransaction(multisignatureTransaction);
			});
			it('should set isMultisignature to true', () => {
				return expect(baseTransaction.isMultisignature).to.be.true;
			});
		});

		describe('when given a transaction with invalid types', () => {
			const invalidTransaction = {
				...defaultTransaction,
				amount: 0,
				fee: 'fee',
			};

			it('should throw a transaction multierror', () => {
				try {
					new TestTransaction(
						(invalidTransaction as unknown) as TransactionJSON,
					);
				} catch (error) {
					return expect(error).to.be.an.instanceOf(TransactionMultiError);
				}

				return Promise.resolve();
			});
		});
	});

	describe('#assetToJSON', () => {
		it('should return an object of type transaction asset', () => {
			return expect(baseTransaction.assetToJSON()).to.be.an('object');
		});
	});

	describe('#toJSON', () => {
		it('should return transaction json', () => {
			baseTransaction = new TestTransaction(defaultTransaction);
			const transactionJSON = baseTransaction.toJSON();

			return expect(transactionJSON).to.be.eql(defaultTransaction);
		});
	});

	describe('#getBytes', () => {
		it('should return a buffer', () => {
			expect(baseTransaction.getBytes()).to.be.an.instanceOf(Buffer);
		});
	});

	describe('#containsUniqueData', () => {
		it('should return a boolean', () => {
			expect(baseTransaction.containsUniqueData()).to.be.a('boolean');
		});
	});

	describe('#checkSchema', () => {
		describe('when given valid transaction', () => {
			beforeEach(() => {
				baseTransaction = new TestTransaction(defaultTransaction);

				return Promise.resolve();
			});

			it('should return a successful transaction response', () => {
				const { id, status, errors } = baseTransaction.checkSchema();

				expect(id).to.be.eql(baseTransaction.id);
				expect(errors).to.be.eql([]);
				return expect(status).to.eql(Status.OK);
			});
		});

		describe('when given invalid data', () => {
			let invalidTransaction: any;
			beforeEach(() => {
				invalidTransaction = {
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
				baseTransaction = new TestTransaction(invalidTransaction as any);
				return Promise.resolve();
			});

			describe('when checked against baseTransaction schema validator', () => {
				it('should return a failed transaction response', () => {
					const { id, status, errors } = baseTransaction.checkSchema();
					const errorsArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					errorsArray.forEach(error =>
						expect(error).to.be.instanceof(TransactionError),
					);
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when given unmatching senderId and senderPublicKey', () => {
				beforeEach(() => {
					const invalidIdTransaction = {
						...defaultTransaction,
						senderId: defaultTransaction.senderId.replace('1', '0'),
					};

					baseTransaction = new TestTransaction(invalidIdTransaction as any);
					return Promise.resolve();
				});

				it('should return a failed transaction response', () => {
					const { id, status, errors } = baseTransaction.checkSchema();
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[1])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							'`senderId` does not match `senderPublicKey`',
						);
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when given invalid id', () => {
				beforeEach(() => {
					const invalidIdTransaction = {
						...defaultTransaction,
						id: defaultTransaction.id.replace('1', '0'),
					};

					baseTransaction = new TestTransaction(invalidIdTransaction as any);
					return Promise.resolve();
				});

				it('should return a failed transaction response', () => {
					const { id, status, errors } = baseTransaction.checkSchema();
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property('message', 'Invalid transaction id');
					return expect(status).to.eql(Status.FAIL);
				});
			});
		});
	});

	describe('#validate', () => {
		describe('when given valid transaction', () => {
			beforeEach(() => {
				baseTransaction = new TestTransaction(defaultTransaction);
				sandbox
					.stub(baseTransaction, 'getBytes')
					.returns(
						Buffer.from(
							'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b020000002092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
						),
					);

				return Promise.resolve();
			});

			it('should return a successful transaction response', () => {
				const { id, status, errors } = baseTransaction.validate();

				expect(id).to.be.eql(baseTransaction.id);
				expect(errors).to.be.eql([]);
				return expect(status).to.eql(Status.OK);
			});
		});

		describe('when given invalid transaction', () => {
			beforeEach(() => {
				sandbox
					.stub(baseTransaction, 'getBytes')
					.returns(
						Buffer.from(
							'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b020000002092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
						),
					);
			});

			describe('with invalid signature', () => {
				beforeEach(() => {
					const invalidSignatureTransaction = {
						...defaultTransaction,
						signature: defaultSignature.replace('1', '0'),
					};
					baseTransaction = new TestTransaction(
						invalidSignatureTransaction as any,
					);
					return Promise.resolve();
				});

				it('should return a failed transaction response', () => {
					const { id, status, errors } = baseTransaction.validate();
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							`Failed to verify signature ${defaultSignature.replace(
								'1',
								'0',
							)}`,
						);
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('with duplicate signatures', () => {
				beforeEach(() => {
					const invalidSignaturesTransaction = {
						...defaultTransaction,
						signatures: [defaultSignature, defaultSignature],
					};
					baseTransaction = new TestTransaction(
						invalidSignaturesTransaction as any,
					);
					return Promise.resolve();
				});

				it('should return a failed transaction response', () => {
					const { id, status, errors } = baseTransaction.validate();
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							'Encountered duplicate signature in transaction',
						);
					return expect(status).to.eql(Status.FAIL);
				});
			});
		});
	});

	describe('#getRequiredAttributes', () => {
		it('should return an object with property `ACCOUNTS` containing address of sender', () => {
			const expectedAddressArray = ['18278674964748191682L'];
			const requiredAttributes: any = baseTransaction.getRequiredAttributes();
			expect(requiredAttributes)
				.to.be.an('object')
				.and.to.have.property('ACCOUNTS');

			return expect(requiredAttributes['ACCOUNTS']).to.be.eql(
				expectedAddressArray,
			);
		});
	});

	describe('#verify', () => {
		describe('when given valid data', () => {
			it('should return a successful transaction response', () => {
				const { id, status, errors } = baseTransaction.verify(
					defaultSenderAccount,
				);

				expect(id).to.be.eql(baseTransaction.id);
				expect(errors).to.be.eql([]);
				return expect(status).to.eql(Status.OK);
			});
		});

		describe('when given invalid data', () => {
			describe('when account publicKey does not match transaction', () => {
				it('should return a failed transaction response', () => {
					const senderAccount = {
						...defaultSenderAccount,
						publicKey: defaultSenderAccount.publicKey.replace('0', '1'),
					};
					const { id, status, errors } = baseTransaction.verify(senderAccount);
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property('message', 'Invalid sender publicKey');
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when account address does not match transaction', () => {
				it('should return a failed transaction response', () => {
					const senderAccount = {
						...defaultSenderAccount,
						address: defaultSenderAccount.address.replace('1', '0'),
					};
					const { id, status, errors } = baseTransaction.verify(senderAccount);
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property('message', 'Invalid sender address');
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when account is missing secondPublicKey', () => {
				it('should return a failed transaction response', () => {
					const signedTransaction = {
						...defaultTransaction,
						signSignature: defaultSignature,
					};
					baseTransaction = new TestTransaction(signedTransaction);
					const { secondPublicKey, ...senderAccount } = defaultSenderAccount;
					const { id, status, errors } = baseTransaction.verify(senderAccount);
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							'Sender does not have a secondPublicKey',
						);
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when transaction signSignature is valid', () => {
				it('should return a success transaction response', () => {
					baseTransaction = new TestTransaction(
						defaultSecondSignatureTransaction,
					);
					const { id, status } = baseTransaction.verify(
						defaultSecondSignatureAccount,
					);
					expect(id).to.be.eql(baseTransaction.id);
					return expect(status).to.eql(Status.OK);
				});
			});

			describe('when transaction signSignature is invalid', () => {
				const invalidTransaction = {
					...defaultSecondSignatureTransaction,
					signSignature: defaultSecondSignatureTransaction.signSignature.replace(
						'0',
						'1',
					),
				};

				it('should return a failed transaction response', () => {
					baseTransaction = new TestTransaction(invalidTransaction);
					const { id, status, errors } = baseTransaction.verify(
						defaultSecondSignatureAccount,
					);
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							'Failed to verify signature 11f77b8596df14410f5dd5cf9ef9bd2a20f66a48863455a163cabc0c220ea235d8b98dec684bd86f62b312615e7f64b23d7b8699775e7c15dad0aef0abd4f503',
						);
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when account has insufficient balance', () => {
				it('should return a failed transaction response', () => {
					const senderAccount = {
						...defaultSenderAccount,
						balance: '0',
					};
					const { id, status, errors } = baseTransaction.verify(senderAccount);
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							'Account does not have enough LSK: 18278674964748191682L balance: 0',
						);
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when transaction is missing signSignature', () => {
				it('should return a failed transaction response', () => {
					const senderAccount = {
						...defaultSenderAccount,
						secondPublicKey: defaultTransaction.senderPublicKey,
					};
					const { id, status, errors } = baseTransaction.verify(senderAccount);
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property('message', 'Missing signSignature');
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when given invalid secondPublicKey', () => {
				it('should return a failed transaction response', () => {
					const signedTransaction = {
						...defaultTransaction,
						signSignature: defaultSignature,
					};
					baseTransaction = new TestTransaction(signedTransaction);
					const senderAccount = {
						...defaultSenderAccount,
						secondPublicKey: defaultTransaction.senderPublicKey.replace(
							'1',
							'0',
						),
					};
					const { id, status, errors } = baseTransaction.verify(senderAccount);
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							`Failed to verify signature ${baseTransaction.signSignature}`,
						);
					return expect(status).to.eql(Status.FAIL);
				});
			});

			describe('when given invalid multisignatures', () => {
				it('should return a failed transaction response', () => {
					const multisignatureTransaction = {
						...defaultTransaction,
						signatures: [defaultSignature, defaultSignature],
					};
					baseTransaction = new TestTransaction(multisignatureTransaction);
					const senderAccount = {
						...defaultSenderAccount,
						multisignatures: [
							defaultTransaction.senderPublicKey.replace('0', '1'),
							defaultTransaction.senderPublicKey.replace('0', '1'),
						],
						multimin: 2,
					};
					const { id, status, errors } = baseTransaction.verify(senderAccount);
					const errorArray = errors as ReadonlyArray<TransactionError>;

					expect(id).to.be.eql(baseTransaction.id);
					expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							`Failed to verify signature ${defaultSignature}`,
						);
					return expect(status).to.eql(Status.FAIL);
				});
			});
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a transaction response', () => {
			const otherTransactions = [defaultTransaction, defaultTransaction];
			const {
				id,
				status,
				errors,
			} = baseTransaction.verifyAgainstOtherTransactions(otherTransactions);
			expect(id).to.be.eql(baseTransaction.id);
			expect(errors).to.be.eql([]);
			return expect(status).to.eql(Status.OK);
		});
	});

	describe('#apply', () => {
		beforeEach(() => {
			baseTransaction = new TestTransaction(defaultTransaction);

			return Promise.resolve();
		});

		it('should return an updated sender account with balance minus transaction fee', () => {
			const { state } = baseTransaction.apply(defaultSenderAccount);
			expect(state).to.be.an('array');
			const appliedState = state as ReadonlyArray<Account>;
			return expect(appliedState[0])
				.to.be.an('object')
				.and.to.have.property('balance', '0');
		});
	});

	describe('#undo', () => {
		beforeEach(() => {
			baseTransaction = new TestTransaction(defaultTransaction);

			return Promise.resolve();
		});

		it('should return sender account with original balance', () => {
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
			return expect(undoneState[0])
				.to.be.an('object')
				.and.to.have.property('balance', '10000000');
		});
	});

	describe('#isExpired', () => {
		describe('when transaction is not expired', () => {
			beforeEach(() => {
				let expiredTransaction = {
					...defaultTransaction,
					receivedAt: new Date(),
				};
				baseTransaction = new TestTransaction(expiredTransaction);

				return Promise.resolve();
			});

			it('should return false', () => {
				return expect(baseTransaction.isExpired(new Date())).to.be.false;
			});
		});

		describe('when transaction is expired', () => {
			beforeEach(() => {
				let expiredTransaction = {
					...defaultTransaction,
					receivedAt: new Date(+new Date() - 1300 * 60000),
				};
				baseTransaction = new TestTransaction(expiredTransaction);

				return Promise.resolve();
			});

			it('should return true', () => {
				return expect(baseTransaction.isExpired(new Date())).to.be.true;
			});
		});
	});
});
