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
import * as cryptography from '@liskhq/lisk-cryptography';
import { expect } from 'chai';
import { BaseTransaction } from '../src/base_transaction';
import { TransactionJSON, Status, Account } from '../src/transaction_types';
import { TransactionError, TransactionMultiError } from '../src/errors';
import BigNum from 'browserify-bignum';
import { TestTransaction } from './helpers/test_transaction_class';

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

	let baseTransaction: BaseTransaction;

	beforeEach(() => {
		baseTransaction = new TestTransaction(defaultTransaction);
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

	describe('#constructor', () => {
		it('should create a new instance of BaseTransaction', () => {
			return expect(baseTransaction)
				.to.be.an('object')
				.and.be.instanceof(BaseTransaction);
		});

		describe('when given a transaction with invalid types', () => {
			let invalidTypeTransaction: any;
			beforeEach(() => {
				invalidTypeTransaction = {
					...defaultTransaction,
					amount: 100,
					fee: 100,
				};
			});

			it('should throw a multierror', () => {
				return expect(
					() => new TestTransaction(invalidTypeTransaction),
				).to.throw(TransactionMultiError);
			});
		});
	});

	describe('#toJSON', () => {
		it('should return transaction json', () => {
			const transactionJSON = baseTransaction.toJSON();

			return expect(transactionJSON).to.be.eql(defaultTransaction);
		});
	});

	describe('#getBasicBytes', () => {
		beforeEach(() => {
			baseTransaction = new TestTransaction(defaultTransaction);

			return Promise.resolve();
		});

		it('should return a buffer', () => {
			const expectedBuffer = Buffer.from(
				'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
				'hex',
			);

			return expect(baseTransaction.getBytes()).to.be.eql(expectedBuffer);
		});

		it('should call cryptography.hexToBuffer', () => {
			const hexToBufferStub = sandbox
				.stub(cryptography, 'hexToBuffer')
				.returns(Buffer.from('senderPublicKey'));
			baseTransaction.getBytes();

			return expect(hexToBufferStub).to.be.calledWithExactly(
				baseTransaction.senderPublicKey,
			);
		});

		it('should call cryptography.bigNumberToBuffer once when recipientId provided', () => {
			const bigNumberToBufferStub = sandbox
				.stub(cryptography, 'bigNumberToBuffer')
				.returns(Buffer.from('recipientId'));
			baseTransaction.getBytes();

			return expect(bigNumberToBufferStub).to.be.calledOnce;
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

			it('should return an object with boolean `validated` = true for valid input', () => {
				const { status } = baseTransaction.checkSchema();

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
					senderPublicKey: '111111111',
					senderId: '11111111',
					timestamp: 79289378,
					asset: {},
					signature: '1111111111',
					id: '1',
				};
				baseTransaction = new TestTransaction(invalidTransaction as any);
				return Promise.resolve();
			});

			it('should return a transaction response with status = FAIL', () => {
				const { status } = baseTransaction.checkSchema();

				return expect(status).to.eql(Status.FAIL);
			});

			it('should return a transaction response with errors ', () => {
				const { errors } = baseTransaction.checkSchema();
				const errorsArray = errors as ReadonlyArray<TransactionError>;

				return errorsArray.forEach(error =>
					expect(error).to.be.instanceof(TransactionError),
				);
			});
		});
	});

	// TODO: Add more tests
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
			it('should return a transaction response with status = OK', () => {
				const { status } = baseTransaction.validate();

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

			describe('with invalid id', () => {
				beforeEach(() => {
					const invalidIdTransaction = {
						...defaultTransaction,
						id: defaultTransaction.id.replace('1', '0'),
					};
					baseTransaction = new TestTransaction(invalidIdTransaction as any);
					return Promise.resolve();
				});

				it('should return a transaction response with status = FAIL', () => {
					const { status } = baseTransaction.validate();

					return expect(status).to.eql(Status.FAIL);
				});

				it('should return a transaction response containing Invalid ID error', () => {
					const { errors } = baseTransaction.validate();
					const errorArray = errors as ReadonlyArray<TransactionError>;

					return expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property('message', 'Invalid transaction id');
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

				it('should return a transaction response with status = FAIL', () => {
					const { status } = baseTransaction.validate();

					return expect(status).to.eql(Status.FAIL);
				});

				it('should return an object with an array containing signatures error', () => {
					const { errors } = baseTransaction.validate();
					const errorArray = errors as ReadonlyArray<TransactionError>;

					return expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							'Encountered duplicate signature in transaction',
						);
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

	// TODO: Add more tests
	describe('#verify', () => {
		describe('when given invalid data', () => {
			let defaultMultisigTransaction: any;
			let defaultMultisigAccount: any;
			beforeEach(() => {
				defaultMultisigTransaction = {
					id: '8191213966308378713',
					type: 4,
					timestamp: 15869462,
					senderPublicKey:
						'0e88b1ca1414078f51a5f173356dfbf48a95b941764b894594c54f211c636941',
					senderId: '15682180043073388494L',
					recipientId: '',
					recipientPublicKey: '',
					amount: '0',
					fee: '1500000000',
					signature:
						'bdfae7698da7e6082bfdc170db811d1e787ae9b5fa4c39acb980b551b7acefef64a8ed0c635a17f0b42233cf871903bcb90e5148e0bfa8b9dea2a05a58f3200b',
					signatures: [
						'd67e178056f896ffd4c04a752fa68d5df6c00765ef2a427426d2aeb67fbc624237aa230b577ddbb8dfa7068b87c8849b00ae58b7f0b2464c5f9675256d392706',
						'db7fe4e0c58e458edd53ee1d61223f1da411a9e0cb3d15735219958fb9b3d646721584ea62716695bcf978b8210b9cf14645b672533182b8989f9577a0e18309',
					],
					asset: {
						multisignature: {
							min: 3,
							lifetime: 24,
							keysgroup: [
								'+02e229bc194aa90ef80cc8461eccc830b52d01678add6e0426252f3a0aa7f14f',
								'+1f2bc9022d0440254c33b5a9c09abfb864623ac9c9ea3285d79bc25d4de430f7',
							],
						},
					},
				};

				defaultMultisigAccount = {
					address: '15682180043073388494L',
					balance: '31351052901',
					publicKey:
						'0e88b1ca1414078f51a5f173356dfbf48a95b941764b894594c54f211c636941',
					secondPublicKey: '',
					multisignatures: [],
					multimin: 2,
				};

				baseTransaction = new TestTransaction(
					defaultMultisigTransaction as any,
				);
				return Promise.resolve();
			});

			// describe('when receiving account state with sufficient balance', () => {
			// 	it('should return a transaction response with status = OK', () => {
			// 		// const sender = { ...defaultSenderAccount, balance: '500000000000'}
			// 		const { status } = baseTransaction.verify(defaultMultisigAccount);

			// 		return expect(status).to.eql(Status.OK);
			// 	});
			// });

			// describe('when receiving account state with insufficient balance', () => {
			// 	it('should return a transaction response with status = FAIL', () => {
			// 		const senderAccount = {
			// 			...defaultMultisigAccount,
			// 			balance: '0',
			// 		};
			// 		const { status } = baseTransaction.verify(senderAccount);

			// 		return expect(status).to.eql(Status.FAIL);
			// 	});

			// 	it('should return a transaction response containing insufficient balance error', () => {
			// 		const senderAccount = {
			// 			...defaultMultisigAccount,
			// 			balance: '0',
			// 		};
			// 		const { errors } = baseTransaction.verify(senderAccount);
			// 		const errorArray = errors as ReadonlyArray<TransactionError>;

			// 		return expect(errorArray[0])
			// 			.to.be.instanceof(TransactionError)
			// 			.and.to.have.property(
			// 				'message',
			// 				'Account does not have enough LSK: 18278674964748191682L balance: 0',
			// 			);
			// 	});
			// });

			describe('when receiving account state with invalid multisignatures', () => {
				it('should return a transaction response with status = FAIL', () => {
					const senderAccount = {
						...defaultMultisigAccount,
					};
					const { status } = baseTransaction.verify(senderAccount);

					return expect(status).to.eql(Status.FAIL);
				});
			});
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a transaction response with status of type number', () => {
			const otherTransactions = [defaultTransaction, defaultTransaction];
			const { status } = baseTransaction.verifyAgainstOtherTransactions(
				otherTransactions,
			);

			return expect(status).to.be.a('number');
		});
	});

	describe('#apply', () => {
		beforeEach(() => {
			baseTransaction = new TestTransaction(defaultTransaction);

			return Promise.resolve();
		});

		describe('when transaction not yet applied', () => {
			it('should return an updated sender account with balance minus transaction fee', () => {
				const { state } = baseTransaction.apply(defaultSenderAccount);

				return expect(state)
					.to.be.an('object')
					.and.to.have.property('balance', '0');
			});
		});
	});

	describe('#undo', () => {
		beforeEach(() => {
			baseTransaction = new TestTransaction(defaultTransaction);

			return Promise.resolve();
		});

		it('should return sender account with original balance', () => {
			const { state: appliedState } = baseTransaction.apply(
				defaultSenderAccount,
			);
			const { state } = baseTransaction.undo(appliedState as Account);

			return expect(state)
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
				return expect(baseTransaction.isExpired()).to.be.false;
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
				return expect(baseTransaction.isExpired()).to.be.true;
			});
		});
	});
});
