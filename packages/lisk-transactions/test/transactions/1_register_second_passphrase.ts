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
import { SinonStub } from 'sinon';
import {
	SecondSignatureTransaction,
	Attributes,
	BaseTransaction,
} from '../../src/transactions';
import {
	validRegisterSecondSignatureTransaction,
	validTransaction,
} from '../../fixtures';
import { Status, TransactionJSON } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';
import * as utils from '../../src/utils';
import { FEES } from '../../src/constants';
import { hexToBuffer } from '@liskhq/lisk-cryptography';

describe('Second signature registration transaction class', () => {
	let validTestTransaction: SecondSignatureTransaction;
	const sender = {
		address: '10020978176543317477L',
		balance: '32981247530771',
		publicKey:
			'8aceda0f39b35d778f55593227f97152f0b5a78b80b5c4ae88979909095d6204',
	};

	beforeEach(async () => {
		validTestTransaction = new SecondSignatureTransaction(
			validRegisterSecondSignatureTransaction,
		);
	});

	describe('#constructor', () => {
		it('should create instance of SecondSignatureTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(SecondSignatureTransaction);
		});

		it('should set the second signature asset', async () => {
			expect(validTestTransaction.asset.signature)
				.to.be.an('object')
				.and.to.have.property('publicKey');
		});

		it('should throw TransactionMultiError when asset signature publicKey is not string', async () => {
			const invalidSecondSignatureTransaction = {
				...validRegisterSecondSignatureTransaction,
				asset: {
					signature: { publicKey: 123 },
				},
			};
			expect(
				() => new SecondSignatureTransaction(invalidSecondSignatureTransaction),
			).to.throw('Invalid field types');
		});
	});

	describe('#create', () => {
		const timeWithOffset = 38350076;
		const passphrase = 'secret';
		const secondPassphrase = 'second secret';

		let result: object;

		beforeEach(async () => {
			sandbox.stub(utils, 'getTimeWithOffset').returns(timeWithOffset);
		});

		describe('when the transaction is created with passphrase and second passphrase', () => {
			beforeEach(async () => {
				result = SecondSignatureTransaction.create({
					passphrase,
					secondPassphrase,
				});
			});

			it('should create second signature registration transaction', async () => {
				expect(result).to.have.property('id');
				expect(result).to.have.property('type', 1);
				expect(result).to.have.property('amount', '0');
				expect(result).to.have.property('fee', FEES[1].toString());
				expect(result).to.have.property('senderId');
				expect(result).to.have.property('senderPublicKey');
				expect(result).to.have.property('recipientId', '');
				expect(result).to.have.property('timestamp', timeWithOffset);
				expect(result).to.have.property('signature').and.not.to.be.empty;
				expect((result as any).asset.signature.publicKey).to.eql(
					'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f',
				);
			});
		});
	});

	describe('#fromJSON', () => {
		beforeEach(async () => {
			sandbox
				.stub(SecondSignatureTransaction.prototype, 'validateSchema')
				.returns({
					id: validTestTransaction.id,
					status: Status.OK,
					errors: [],
				});
			validTestTransaction = SecondSignatureTransaction.fromJSON(
				validRegisterSecondSignatureTransaction,
			);
		});

		it('should create instance of SecondSignatureTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(SecondSignatureTransaction);
		});

		it('should call validateSchema', async () => {
			expect(validTestTransaction.validateSchema).to.be.calledOnce;
		});

		it('should throw an error if validateSchema returns error', async () => {
			(SecondSignatureTransaction.prototype
				.validateSchema as SinonStub).returns({
				status: Status.FAIL,
				errors: [new TransactionError()],
			});
			expect(
				SecondSignatureTransaction.fromJSON.bind(
					undefined,
					validRegisterSecondSignatureTransaction,
				),
			).to.throw('Failed to validate schema.');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(
				hexToBuffer(
					validRegisterSecondSignatureTransaction.asset.signature.publicKey,
				),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true with non conflicting transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				{ ...validRegisterSecondSignatureTransaction, type: 0 },
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return status true with non related transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when other second signature registration transaction from the same account exists', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validRegisterSecondSignatureTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(1);
			expect(status).to.equal(Status.FAIL);
		});
	});

	describe('#getRequiredAttributes', () => {
		let attribute: Attributes;

		beforeEach(async () => {
			attribute = validTestTransaction.getRequiredAttributes();
		});

		it('should return attribute including sender address', async () => {
			expect(attribute.account.address).to.include(
				validRegisterSecondSignatureTransaction.senderId,
			);
		});
	});

	describe('#validateSchema', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.validateSchema();

			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with error when amount is non-zero', async () => {
			const invalidTransaction = {
				...validRegisterSecondSignatureTransaction,
				amount: '100',
			};
			const transaction = new SecondSignatureTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();

			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when asset includes invalid publicKey', async () => {
			const invalidTransaction = {
				...validRegisterSecondSignatureTransaction,
				asset: {
					signature: {
						publicKey: '1234',
					},
				},
			};
			const transaction = new SecondSignatureTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();

			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});
	});

	describe('#verify', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with error when state sender already has secondPublicKey', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: { ...sender, secondPublicKey: '123' },
			});

			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});
	});

	describe('#apply', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when state does not exist from the base transaction', async () => {
			sandbox.stub(BaseTransaction.prototype, 'apply').returns({});
			expect(
				validTestTransaction.apply.bind(validTransaction, {
					sender,
				}),
			).to.throw('State is required for applying transaction.');
		});

		it('should return updated account state with added secondPublicKey', async () => {
			const { state } = validTestTransaction.apply({
				sender,
			});
			expect((state as any).sender.secondPublicKey).to.eql(
				validTestTransaction.asset.signature.publicKey,
			);
		});

		it('should return TransactionResponse with error when secondPublicKey exists on account', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender: { ...sender, secondPublicKey: '1234' },
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.contains(
				'Register second signature only allowed once per account.',
			);
		});
	});

	describe('#undo', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.undo({
				sender,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when state does not exist from the base transaction', async () => {
			sandbox.stub(BaseTransaction.prototype, 'undo').returns({});
			expect(
				validTestTransaction.undo.bind(validTestTransaction, {
					sender,
				}),
			).to.throw('State is required for undoing transaction.');
		});

		it('should return updated account state without secondPublicKey', async () => {
			const { state } = validTestTransaction.undo({ sender });

			expect((state as any).sender.secondPublicKey).not.to.exist;
		});
	});
});
