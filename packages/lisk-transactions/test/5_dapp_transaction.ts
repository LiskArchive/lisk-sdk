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
import { MockStateStore as store } from './helpers';
import { DappTransaction } from '../src/5_dapp_transaction';
import { validDappTransactions, validVoteTransactions } from '../fixtures';
import { TransactionJSON } from '../src/transaction_types';
import { Status } from '../src/response';
import * as utils from '../src/utils';

describe('Dapp transaction class', () => {
	const defaultValidDappTransaction = validDappTransactions[0];
	const defaultValidSender = {
		address: '11262132350228604999L',
		balance: '1000000000',
		publicKey:
			'f19d39b087a3174cbf113162f2dad498edbf84341ffbfeb650a365ac8a40ac04',
	};
	let validTestTransaction: DappTransaction;

	beforeEach(async () => {
		validTestTransaction = new DappTransaction(defaultValidDappTransaction);
		store.account.get = () => defaultValidSender;
		store.transaction.find = () => undefined;
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

	describe('#validateAsset', () => {
		beforeEach(async () => {
			sandbox.stub(utils, 'getId').returns(validTestTransaction.id);
		});

		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();
			expect(errors).to.be.an('array').and.empty;
		});

		it('should return error when amount is not zero', async () => {
			const invalidTransaction = {
				...defaultValidDappTransaction,
				amount: '100',
			};
			const transaction = new DappTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.amount');
		});

		it('should return error when link is in invalid suffix', async () => {
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
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.link');
		});

		it('should return error when link is not url', async () => {
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
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.dapp.link');
		});

		it('should return error when icon is in invalid suffix', async () => {
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
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.icon');
		});

		it('should return error when type is not zero', async () => {
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
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.dapp.type');
		});

		it('should return error when tags contains non unique key', async () => {
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
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.asset.dapp.tags');
		});

		it('should return error when category is out of range', async () => {
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
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.dapp.category');
		});

		it('should return error when dapp name exceeds maximum', async () => {
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

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.dapp.name');
		});
	});

	describe('#applyAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).to.be.empty;
		});

		it('should return error when store includes the transaction with same dapp name', async () => {
			const invalidDappTransaction = {
				...validDappTransactions[2],
				asset: {
					dapp: {
						...validDappTransactions[2].asset.dapp,
						name: defaultValidDappTransaction.asset.dapp.name,
					},
				},
			};
			store.transaction.find = () => invalidDappTransaction;

			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
		});
	});

	describe('#undoAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).undoAsset(store);

			expect(errors).to.be.empty;
		});
	});
});
