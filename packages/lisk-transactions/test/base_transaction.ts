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
import * as utils from '../src/utils';
import { TransactionJSON } from '../src/transaction_types';
import { TransactionError } from '../src/errors';
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
	};

	const defaultSenderAccount = {
		address: '18278674964748191682L',
		unconfirmedBalance: '10000000',
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
		let normalizeInputStub: () => void;
		beforeEach(() => {
			normalizeInputStub = sandbox
				.stub(utils, 'normalizeInput')
				.returns(defaultTransaction);

			return Promise.resolve();
		});

		it('should create a new instance of BaseTransaction', () => {
			return expect(baseTransaction)
				.to.be.an('object')
				.and.be.instanceof(BaseTransaction);
		});

		it('should call normalizeInput with provided rawTransaction', () => {
			baseTransaction = new TestTransaction(defaultTransaction);
			return expect(normalizeInputStub).to.be.calledWithExactly(
				defaultTransaction,
			);
		});
	});

	describe('#toJSON', () => {
		it('should return transaction json', () => {
			const transactionJSON = baseTransaction.toJSON();

			return expect(transactionJSON).to.be.eql(defaultTransaction);
		});
	});

	describe('#getBytes', () => {
		describe('when transaction is unsigned', () => {
			beforeEach(() => {
				const { signature, ...unsignedTransaction } = defaultTransaction;
				baseTransaction = new TestTransaction(unsignedTransaction);

				return Promise.resolve();
			});

			it('should return a buffer', () => {
				const expectedBuffer = Buffer.from(
					'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
					'hex',
				);

				return expect(baseTransaction.getBytes()).to.be.eql(expectedBuffer);
			});

			it('should call cryptography.hexToBuffer once', () => {
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

		describe('when transaction is signed', () => {
			beforeEach(() => {
				baseTransaction = new TestTransaction(defaultTransaction);

				return Promise.resolve();
			});

			it('should return a buffer', () => {
				const expectedBuffer = Buffer.from(
					'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b020000002092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
					'hex',
				);

				return expect(baseTransaction.getBytes()).to.be.eql(expectedBuffer);
			});

			it('should call cryptography.hexToBuffer twice', () => {
				const hexToBufferStub = sandbox
					.stub(cryptography, 'hexToBuffer')
					.onFirstCall()
					.returns(Buffer.from('senderPublicKey'))
					.onSecondCall()
					.returns(Buffer.from('signature'));
				baseTransaction.getBytes();

				expect(hexToBufferStub).calledWithExactly(
					baseTransaction.senderPublicKey,
				);
				return expect(hexToBufferStub).calledWithExactly(
					baseTransaction.signature,
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

		describe('when transaction is signed and has a second signature', () => {
			beforeEach(() => {
				const signedTransaction = {
					...defaultTransaction,
					signSignature: defaultSignature,
				};
				baseTransaction = new TestTransaction(signedTransaction);

				return Promise.resolve();
			});

			it('should return a buffer', () => {
				const expectedBuffer = Buffer.from(
					'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b020000002092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b3092092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
					'hex',
				);

				return expect(baseTransaction.getBytes()).to.be.eql(expectedBuffer);
			});

			it('should call cryptography.hexToBuffer thrice', () => {
				const hexToBufferStub = sandbox
					.stub(cryptography, 'hexToBuffer')
					.onFirstCall()
					.returns(Buffer.from('senderPublicKey'))
					.onSecondCall()
					.returns(Buffer.from('signature'))
					.onThirdCall()
					.returns(Buffer.from('signSignature'));
				baseTransaction.getBytes();

				expect(hexToBufferStub).calledWithExactly(
					baseTransaction.senderPublicKey,
				);
				expect(hexToBufferStub).calledWithExactly(baseTransaction.signature);
				return expect(hexToBufferStub).calledWithExactly(
					baseTransaction.signSignature,
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
	});

	describe('#containsUniqueData', () => {
		it('should return a boolean', () => {
			expect(baseTransaction.containsUniqueData()).to.be.a('boolean');
		});
	});

	describe('#validate', () => {
		describe('when given valid signed transaction', () => {
			beforeEach(() => {
				baseTransaction = new TestTransaction(defaultTransaction);
				return Promise.resolve();
			});

			it('should return an object with boolean `validated` = true for valid input', () => {
				const { validated } = baseTransaction.validate();

				return expect(validated).to.be.true;
			});
		});

		describe('when given invalid data', () => {
			let invalidTransaction: any;
			beforeEach(() => {
				invalidTransaction = {
					type: 4,
					amount: '0',
					fee: '3000000000',
					recipientId: '',
					senderPublicKey:
						'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
					timestamp: 54196080,
					asset: {
						multisignature: {
							min: 0,
							lifetime: 18,
							keysgroup: [
								'+740834a59435d283fd3fb30ad5d7cbde2550e82471b73abedcffb61eaa6298e4',
								'+9bc8972fb01b70eb4624df5d4d4c7c00a51fd73958c50efaefe55260889aedd6',
								'+66a68de8047bbe788f5ec5fbae6baf84c6438606f4e6fdf91b791113a0506ea6',
								'+5f7c4b9b6f976a400dba8d0cc7f904603ea4ffe1d8702c80576a396037c49970',
								'+4e4a6b5cf7b8840ba521dfae5914f55ec3805c7d5cf25dfbf44fac57f9c5f183',
							],
						},
					},
					signature:
						'57b54da646c7567df86fec60aa57a40bfadb6cdc65cccecfc442c822a7b0372f4958a280edd3fc2d83d38e2d3bf922a1da01249c500f0309a9638e941a21c501',
					id: '13916871066741078807',
				};
				baseTransaction = new TestTransaction(invalidTransaction as any);
				return Promise.resolve();
			});

			it('should call validateTransaction', () => {
				const transaction = baseTransaction.toJSON();
				const validateTransactionStub = sandbox
					.stub(utils, 'validateTransaction')
					.returns({ valid: true });
				baseTransaction.validate();
				return expect(validateTransactionStub).to.be.calledWithExactly(
					transaction,
				);
			});

			it('should call verifyTransaction', () => {
				const transaction = baseTransaction.toJSON();
				const validateTransactionStub = sandbox
					.stub(utils, 'verifyTransaction')
					.returns({ valid: true });
				baseTransaction.validate();
				return expect(validateTransactionStub).to.be.calledWithExactly(
					transaction,
				);
			});

			it('should return an object with boolean `validated` = false', () => {
				const { validated } = baseTransaction.validate();

				return expect(validated).to.not.be.true;
			});

			it('should return an object with an array of transactions errors ', () => {
				const { errors } = baseTransaction.validate();
				const errorsArray = errors as ReadonlyArray<TransactionError>;

				return errorsArray.forEach(error =>
					expect(error).to.be.instanceof(TransactionError),
				);
			});

			describe('when given transaction with invalid or missing type', () => {
				beforeEach(() => {
					const { type, ...invalidTypeTransaction } = defaultTransaction;
					baseTransaction = new TestTransaction(invalidTypeTransaction as any);
					return Promise.resolve();
				});

				it('should return an object with an array containing transaction type error', () => {
					const { errors } = baseTransaction.validate();
					const errorArray = errors as ReadonlyArray<TransactionError>;

					return expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property('message', 'Invalid transaction type.');
				});
			});

			describe('when given transaction with no signature', () => {
				beforeEach(() => {
					const { signature, ...unsignedTransaction } = defaultTransaction;
					baseTransaction = new TestTransaction(unsignedTransaction as any);
					return Promise.resolve();
				});

				it('should return an object with an array containing transaction signature error', () => {
					const { errors } = baseTransaction.validate();
					const errorArray = errors as ReadonlyArray<TransactionError>;

					return expect(errorArray[0])
						.to.be.instanceof(TransactionError)
						.and.to.have.property(
							'message',
							'Cannot validate transaction without signature.',
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

	describe('#verifyAgainstState', () => {
		it('should call verifyTransaction for account with secondPublicKey', () => {
			const transaction = baseTransaction.toJSON();
			const senderAccountWithSecondPublicKey = {
				...defaultSenderAccount,
				secondPublicKey: '123456789',
			};
			const verifyTransactionStub = sandbox
				.stub(utils, 'verifyTransaction')
				.returns({ valid: true });
			baseTransaction.verifyAgainstState(senderAccountWithSecondPublicKey);
			return expect(verifyTransactionStub).to.be.calledWithExactly(
				transaction,
				senderAccountWithSecondPublicKey.secondPublicKey,
			);
		});

		describe('when receiving account state with sufficient balance', () => {
			it('should return an object with boolean `verified` = true', () => {
				const { verified } = baseTransaction.verifyAgainstState(
					defaultSenderAccount,
				);

				return expect(verified).to.be.true;
			});
		});

		describe('when receiving account state with insufficient balance', () => {
			it('should return an object with boolean `verified` = false', () => {
				const senderAccount = {
					...defaultSenderAccount,
					unconfirmedBalance: '0',
					balance: '0',
				};
				const { verified } = baseTransaction.verifyAgainstState(senderAccount);

				return expect(verified).to.be.false;
			});

			it('should return an object with an array containing transaction type error', () => {
				const senderAccount = {
					...defaultSenderAccount,
					unconfirmedBalance: '0',
					balance: '0',
				};
				const { errors } = baseTransaction.verifyAgainstState(senderAccount);
				const errorArray = errors as ReadonlyArray<TransactionError>;

				return expect(errorArray[0])
					.to.be.instanceof(TransactionError)
					.and.to.have.property(
						'message',
						'Account does not have enough LSK: 18278674964748191682L balance: 0',
					);
			});
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return an object with boolean `verified`', () => {
			const otherTransactions = [defaultTransaction, defaultTransaction];
			const { verified } = baseTransaction.verifyAgainstOtherTransactions(
				otherTransactions,
			);

			return expect(verified).to.be.a('boolean');
		});
	});

	describe('#apply', () => {
		beforeEach(() => {
			baseTransaction = new TestTransaction(defaultTransaction);

			return Promise.resolve();
		});

		describe('when transaction not yet applied', () => {
			it('should return an updated sender account with balance minus transaction fee', () => {
				const { sender } = baseTransaction.apply(defaultSenderAccount);

				return expect(sender)
					.to.be.an('object')
					.and.to.have.property('balance', '0');
			});
		});

		describe('when transaction already applied', () => {
			beforeEach(() => {
				baseTransaction.apply(defaultSenderAccount);

				return Promise.resolve();
			});

			it('should return sender account with unchanged balance', () => {
				const { sender } = baseTransaction.apply(defaultSenderAccount);

				return expect(sender)
					.to.be.an('object')
					.and.to.have.property('balance', '10000000');
			});
		});
	});

	describe('#undo', () => {
		beforeEach(() => {
			baseTransaction = new TestTransaction(defaultTransaction);

			return Promise.resolve();
		});

		describe('when transaction has been applied', () => {
			it('should return sender account with original balance', () => {
				const { sender: appliedSender } = baseTransaction.apply(
					defaultSenderAccount,
				);
				const { sender } = baseTransaction.undo(appliedSender);

				return expect(sender)
					.to.be.an('object')
					.and.to.have.property('balance', '10000000');
			});
		});

		describe('when transaction not applied', () => {
			it('should return sender account with unchanged balance', () => {
				const { sender } = baseTransaction.undo(defaultSenderAccount);

				return expect(sender)
					.to.be.an('object')
					.and.to.have.property('balance', '10000000');
			});
		});
	});
});
