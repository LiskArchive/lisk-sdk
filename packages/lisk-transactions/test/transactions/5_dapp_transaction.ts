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
import { DappTransaction, Attributes } from '../../src/transactions';
import { validDappTransactions, validVoteTransactions } from '../../fixtures';
import { Status, TransactionJSON } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';
import * as utils from '../../src/utils';
import { DAPP_FEE } from '../../src/constants';

describe('Dapp transaction class', () => {
	const defaultValidDappTransaction = validDappTransactions[0];
	let validTestTransaction: DappTransaction;

	beforeEach(async () => {
		validTestTransaction = new DappTransaction(defaultValidDappTransaction);
	});

	describe('#constructor', () => {
		it('should create instance of DappTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(DappTransaction);
		});

		it('should set the dapp asset', async () => {
			expect(validTestTransaction.asset.dapp).to.be.an('object');
		});

		it('should throw TransactionMultiError when asset is not string array', async () => {
			const invalidDappTransactionData = {
				...defaultValidDappTransaction,
				asset: {
					dapp: {
						name: 123,
					},
				},
			};
			expect(() => new DappTransaction(invalidDappTransactionData)).to.throw(
				'Invalid field types.',
			);
		});
	});

	describe('#create', () => {
		const timeWithOffset = 38350076;
		const passphrase = 'secret';
		const secondPassphrase = 'second secret';
		const defaultOptions = {
			name: 'bitbooks',
			type: 0,
			link: 'https://github.com/VivekAusekar/liskApp/archive/stage.zip',
			category: 0,
		};

		let result: object;

		beforeEach(async () => {
			sandbox.stub(utils, 'getTimeWithOffset').returns(timeWithOffset);
		});

		describe('when the transaction is created with one passphrase and minimum options', () => {
			beforeEach(async () => {
				result = DappTransaction.create({
					passphrase,
					options: defaultOptions,
				});
			});

			it('should create dapp transaction ', async () => {
				expect(result).to.have.property('id');
				expect(result).to.have.property('type', 5);
				expect(result).to.have.property('amount', '0');
				expect(result).to.have.property('fee', DAPP_FEE.toString());
				expect(result).to.have.property('senderId');
				expect(result).to.have.property('senderPublicKey');
				expect(result).to.have.property(
					'recipientId',
					(result as any).senderId,
				);
				expect(result).to.have.property('timestamp', timeWithOffset);
				expect(result).to.have.property('signature').and.not.to.be.empty;
				expect((result as any).asset.dapp).to.eql(defaultOptions);
			});

			it('should use time.getTimeWithOffset to calculate the timestamp', async () => {
				expect(utils.getTimeWithOffset).to.be.calledWithExactly(undefined);
			});

			it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', async () => {
				const offset = -10;
				DappTransaction.create({
					passphrase,
					options: defaultOptions,
					timeOffset: offset,
				});
				expect(utils.getTimeWithOffset).to.be.calledWithExactly(offset);
			});
		});

		describe('when the transaction is created with first and second passphrase', () => {
			beforeEach(async () => {
				result = DappTransaction.create({
					passphrase,
					secondPassphrase,
					options: defaultOptions,
				});
			});

			it('should create dapp transaction ', async () => {
				expect(result).to.have.property('id');
				expect(result).to.have.property('type', 5);
				expect(result).to.have.property('amount', '0');
				expect(result).to.have.property('fee', DAPP_FEE.toString());
				expect(result).to.have.property('senderId');
				expect(result).to.have.property('senderPublicKey');
				expect(result).to.have.property(
					'recipientId',
					(result as any).senderId,
				);
				expect(result).to.have.property('timestamp', timeWithOffset);
				expect(result).to.have.property('signature').and.not.to.be.empty;
				expect(result).to.have.property('signSignature').and.not.to.be.empty;
				expect((result as any).asset.dapp).to.eql(defaultOptions);
			});
		});

		describe('when the transaction is created with invalid inputs', () => {
			it('should throw an invalid input error when option is empty object', () => {
				expect(
					DappTransaction.create.bind(undefined, {
						passphrase,
						secondPassphrase,
						options: {} as any,
					}),
				).to.throw('Invalid field types.');
			});

			it('should throw an invalid input error when name exceeds 20 characters', () => {
				expect(
					DappTransaction.create.bind(undefined, {
						passphrase,
						secondPassphrase,
						options: {} as any,
					}),
				).to.throw('Invalid field types.');
			});
		});

		describe('when the transaction is created without passphrase', () => {
			beforeEach(async () => {
				result = DappTransaction.create({
					options: defaultOptions,
				});
			});

			it('should create vote transaction ', async () => {
				expect(result).to.have.property('type', 5);
				expect(result).to.have.property('amount', '0');
				expect(result).to.have.property('fee', DAPP_FEE.toString());
				expect(result).to.have.property('timestamp', timeWithOffset);
				expect((result as any).asset.dapp).to.eql(defaultOptions);

				expect((result as any).senderId).to.be.undefined;
				expect((result as any).senderPublicKey).to.be.undefined;
				expect(result).to.have.property('recipientId', '');

				expect(result).not.to.have.property('id');
				expect(result).not.to.have.property('signature');
				expect(result).not.to.have.property('signSignature');
			});
		});
	});

	describe('#fromJSON', () => {
		beforeEach(async () => {
			sandbox.stub(DappTransaction.prototype, 'validateSchema').returns({
				id: validTestTransaction.id,
				status: Status.OK,
				errors: [],
			});
			validTestTransaction = DappTransaction.fromJSON(
				defaultValidDappTransaction,
			);
		});

		it('should create instance of DappTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(DappTransaction);
		});

		it('should call validateSchema', async () => {
			expect(validTestTransaction.validateSchema).to.be.calledOnce;
		});

		it('should throw an error if validateSchema returns error', async () => {
			(DappTransaction.prototype.validateSchema as SinonStub).returns({
				status: Status.FAIL,
				errors: [new TransactionError()],
			});
			expect(
				DappTransaction.fromJSON.bind(undefined, defaultValidDappTransaction),
			).to.throw('Failed to validate schema.');
		});
	});

	describe('#getAssetBytes', () => {
		const defaultCategory = 0;
		const defaultDappName = 'Lisk Guestbook';
		const defaultDescription = 'The official Lisk guestbook';
		const defaultTags = 'guestbook message sidechain';
		const defaultType = 0;
		const defaultLink =
			'https://github.com/MaxKK/guestbookDapp/archive/master.zip';
		const defaultIcon =
			'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png';
		const dappNameBuffer = Buffer.from('4c69736b204775657374626f6f6b', 'hex');
		const dappDescriptionBuffer = Buffer.from(
			'546865206f6666696369616c204c69736b206775657374626f6f6b',
			'hex',
		);
		const dappTagsBuffer = Buffer.from(
			'6775657374626f6f6b206d6573736167652073696465636861696e',
			'hex',
		);
		const dappLinkBuffer = Buffer.from(
			'68747470733a2f2f6769746875622e636f6d2f4d61784b4b2f6775657374626f6f6b446170702f617263686976652f6d61737465722e7a6970',
			'hex',
		);
		const dappIconBuffer = Buffer.from(
			'68747470733a2f2f7261772e67697468756275736572636f6e74656e742e636f6d2f4d61784b4b2f6775657374626f6f6b446170702f6d61737465722f69636f6e2e706e67',
			'hex',
		);
		const dappTypeBuffer = Buffer.alloc(4, defaultType);
		const dappCategoryBuffer = Buffer.alloc(4, defaultCategory);
		const expectedBuffer = Buffer.concat([
			dappNameBuffer,
			dappDescriptionBuffer,
			dappTagsBuffer,
			dappLinkBuffer,
			dappIconBuffer,
			dappTypeBuffer,
			dappCategoryBuffer,
		]);

		it('should return valid buffer', async () => {
			(validTestTransaction as any).asset = {
				dapp: {
					category: defaultCategory,
					name: defaultDappName,
					description: defaultDescription,
					tags: defaultTags,
					type: defaultType,
					link: defaultLink,
					icon: defaultIcon,
				},
			};
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(expectedBuffer);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true with non conflicting transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validDappTransactions[1],
				validDappTransactions[2],
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
			} = validTestTransaction.verifyAgainstOtherTransactions(
				validVoteTransactions,
			);
			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when other transaction has the same dapp name', async () => {
			const conflictTransaction = {
				...validDappTransactions[2],
				asset: {
					dapp: {
						...validDappTransactions[2].asset.dapp,
						name: defaultValidDappTransaction.asset.dapp.name,
					},
				},
			};
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
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
				defaultValidDappTransaction.senderId,
			);
		});

		it('should return attribute including dapp name', async () => {
			expect(attribute.transaction.dappName).to.include(
				defaultValidDappTransaction.asset.dapp.name,
			);
		});
	});

	describe('#processRequiredState', () => {
		const sender = {
			address: '11262132350228604999L',
			publicKey:
				'f19d39b087a3174cbf113162f2dad498edbf84341ffbfeb650a365ac8a40ac04',
		};

		it('should return sender and dependentState.transaction with empty array when key transaction does not exist', async () => {
			const validEntity = {
				account: [sender],
			};
			const requiredState = validTestTransaction.processRequiredState(
				validEntity,
			);
			expect(requiredState.sender).to.eql(sender);
			expect((requiredState.dependentState as any).transaction).to.be.an(
				'array',
			).and.empty;
		});

		it('should return sender and dependentState.transaction with empty array when the transaction with same type doesn`t exist', async () => {
			const validEntity = {
				account: [sender],
				transaction: validVoteTransactions,
			};
			const requiredState = validTestTransaction.processRequiredState(
				validEntity,
			);
			expect(requiredState.sender).to.eql(sender);
			expect((requiredState.dependentState as any).transaction).to.be.an(
				'array',
			).and.empty;
		});

		it('should return sender and dependentState.transaction with empty array when the transaction with same dapp name doesn`t exist', async () => {
			const validEntity = {
				account: [sender],
				transaction: [validDappTransactions[2]],
			};
			const requiredState = validTestTransaction.processRequiredState(
				validEntity,
			);
			expect(requiredState.sender).to.eql(sender);
			expect((requiredState.dependentState as any).transaction).to.be.an(
				'array',
			).and.empty;
		});

		it('should return sender and dependentState.transaction with the transaction with same dapp name', async () => {
			const invalidDappTransaction = {
				...validDappTransactions[2],
				asset: {
					dapp: {
						...validDappTransactions[2].asset.dapp,
						name: defaultValidDappTransaction.asset.dapp.name,
					},
				},
			};
			const validEntity = {
				account: [sender],
				transaction: [invalidDappTransaction],
			};
			const requiredState = validTestTransaction.processRequiredState(
				validEntity,
			);
			expect(requiredState.sender).to.eql(sender);
			expect((requiredState.dependentState as any).transaction).to.be.an(
				'array',
			);
			expect(
				(requiredState.dependentState as any).transaction[0].asset.dapp.name,
			).to.equal(defaultValidDappTransaction.asset.dapp.name);
		});

		it('should throw an error when state does not have account key', async () => {
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					{},
				),
			).to.throw('Entity account is required.');
		});

		it('should throw an error when account state does not have address and public key', async () => {
			const invalidEntity = {
				account: [
					{ balance: '0' },
					{
						address: '1L',
						publicKey:
							'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
					},
				],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('Required state does not have valid account type.');
		});

		it('should throw an error when account state does not include the sender', async () => {
			const invalidEntity = {
				account: [
					{
						address: '1L',
						publicKey:
							'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
					},
				],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('No sender account is found.');
		});

		it('should throw an error when transaction state includes non transaction', async () => {
			const invalidEntity = {
				account: [sender],
				transaction: [sender],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('Required state does not have valid transaction type.');
		});
	});

	describe('#validateSchema', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.validateSchema();
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.an('array').and.empty;
		});

		it('should return TransactionResponse with error when amount is not zero', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				amount: '100',
			};
			const transaction = new DappTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when dapp name exceeds maximum', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				id: '6689439085046222713',
				asset: {
					dapp: {
						...defaultValidDappTransaction.asset.dapp,
						name: 'Excepteur sint occaecocsd rutrume',
					},
				},
			};
			const transaction = new DappTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.dapp.name');
		});
	});

	describe('#verify', () => {
		const defaultValidSender = {
			address: '11262132350228604999L',
			balance: '1000000000',
			publicKey:
				'f19d39b087a3174cbf113162f2dad498edbf84341ffbfeb650a365ac8a40ac04',
		};

		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { transaction: [] },
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when dependent state does not exist', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
				}),
			).to.throw('Dependent state is required for dapp transaction.');
		});

		it('should throw an error when dependent state does not include transaction', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
					dependentState: {} as any,
				}),
			).to.throw(
				'Dependent transaction state is required for dapp transaction.',
			);
		});

		it('should return TransactionResponse with error when dependent state includes the transaction with same dapp name', async () => {
			const invalidDappTransaction = {
				...validDappTransactions[2],
				asset: {
					dapp: {
						...validDappTransactions[2].asset.dapp,
						name: defaultValidDappTransaction.asset.dapp.name,
					},
				},
			};
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { transaction: [invalidDappTransaction] },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
		});
	});
});
