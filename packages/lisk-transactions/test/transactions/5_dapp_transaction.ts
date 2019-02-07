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
import {
	DappTransaction,
	Attributes,
	BaseTransaction,
} from '../../src/transactions';
import { validDappTransactions, validVoteTransactions } from '../../fixtures';
import { Status, TransactionJSON } from '../../src/transaction_types';
import * as utils from '../../src/utils';

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

		it('should return attribute including dapp link', async () => {
			expect(attribute.transaction.dappLink).to.include(
				defaultValidDappTransaction.asset.dapp.link,
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
		beforeEach(async () => {
			sandbox.stub(utils, 'getId').returns(validTestTransaction.id);
		});

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
			expect(errors[0].dataPath).to.equal('.amount');
		});

		it('should return TransactionResponse with error when link is in invalid suffix', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				asset: {
					dapp: {
						...defaultValidDappTransaction.asset.dapp,
						link:
							'https://github.com/m-schmoock/lisk-dapps-sdk/archive/development.zippo',
					},
				},
			};
			const transaction = new DappTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.link');
		});

		it('should return TransactionResponse with error when link is not url', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				asset: {
					dapp: {
						...defaultValidDappTransaction.asset.dapp,
						link:
							'github.com/m-schmoock/lisk-dapps-sdk/archive/development.zip',
					},
				},
			};
			const transaction = new DappTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.link');
		});

		it('should return TransactionResponse with error when icon is in invalid suffix', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				asset: {
					dapp: {
						...defaultValidDappTransaction.asset.dapp,
						icon: 'https://iconverticons.com/img/logo.gif',
					},
				},
			};
			const transaction = new DappTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.icon');
		});

		it('should return TransactionResponse with error when type is not zero', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				asset: {
					dapp: {
						...defaultValidDappTransaction.asset.dapp,
						type: 3,
					},
				},
			};
			const transaction = new DappTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.type');
		});

		it('should return TransactionResponse with error when tags contains non unique key', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				asset: {
					dapp: {
						...defaultValidDappTransaction.asset.dapp,
						tags: 'game,ftw, game, sidechain',
					},
				},
			};
			const transaction = new DappTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.tags');
		});

		it('should return TransactionResponse with error when category is out of range', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				asset: {
					dapp: {
						...defaultValidDappTransaction.asset.dapp,
						category: 10,
					},
				},
			};
			const transaction = new DappTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.category');
		});

		it('should return TransactionResponse with error when dapp name exceeds maximum', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
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
			expect(errors[0].dataPath).to.equal('.asset.dapp.name');
		});
	});

	describe('#verify', () => {
		const defaultValidSender = {
			address: '11262132350228604999L',
			balance: '1000000000',
			publicKey:
				'f19d39b087a3174cbf113162f2dad498edbf84341ffbfeb650a365ac8a40ac04',
		};

		it('should call BaseTransaction verify', async () => {
			sandbox
				.stub(BaseTransaction.prototype, 'verify')
				.returns({ errors: [] } as any);
			validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { transaction: [] },
			});
			expect(BaseTransaction.prototype.verify).to.be.calledOnce;
		});

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
