/*
 * Copyright © 2020 Lisk Foundation
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
 */

'use strict';

const {
	BaseTransaction,
	TransferTransaction,
} = require('@liskhq/lisk-transactions');
const { KVStore } = require('@liskhq/lisk-db');
const {
	nodeUtils,
	storageUtils,
	configUtils,
} = require('../../../../../utils');
const {
	accounts: { genesis },
} = require('../../../../../fixtures');

/**
 * Implementation of the Custom Transaction enclosed in a class
 */
class CustomTransationClass extends BaseTransaction {
	constructor(input) {
		super(input);
		this.asset = input.asset;
	}

	static get TYPE() {
		return 7;
	}

	static get FEE() {
		return TransferTransaction.FEE;
	}

	assetToJSON() {
		return this.asset;
	}

	// eslint-disable-next-line class-methods-use-this
	assetToBytes() {
		return Buffer.alloc(0);
	}

	// eslint-disable-next-line class-methods-use-this
	applyAsset() {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	undoAsset() {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	matcher() {
		return false;
	}

	// eslint-disable-next-line class-methods-use-this
	validateAsset() {
		return [];
	}

	async prepare(store) {
		await store.account.cache([
			{
				address: this.senderId,
			},
		]);
	}
}

const createRawCustomTransaction = ({
	passphrase,
	nonce,
	networkIdentifier,
	senderPublicKey,
}) => {
	const aCustomTransation = new CustomTransationClass({
		type: 7,
		nonce,
		senderPublicKey,
		asset: {
			data: 'raw data',
		},
		fee: (10000000).toString(),
	});
	aCustomTransation.sign(networkIdentifier, passphrase);

	return aCustomTransation.toJSON();
};

describe('Matcher', () => {
	const dbName = 'transaction_matcher';
	let storage;
	let node;
	let forgerDB;

	beforeAll(async () => {
		storage = new storageUtils.StorageSandbox(
			configUtils.storageConfig({ database: dbName }),
			dbName,
		);
		await storage.bootstrap();
		forgerDB = new KVStore(`/tmp/${dbName}.db`);
		node = await nodeUtils.createAndLoadNode(storage, forgerDB);
		await node._forger.loadDelegates();
	});

	afterAll(async () => {
		await forgerDB.clear();
		await node.cleanup();
		await storage.cleanup();
	});

	describe('given a disallowed transaction', () => {
		describe('when transaction is pass to node', () => {
			it('should be rejected', async () => {
				const account = nodeUtils.createAccount();
				const tx = createRawCustomTransaction({
					passphrase: account.passphrase,
					networkIdentifier: node._networkIdentifier,
					senderPublicKey: account.publicKey,
					nonce: '0',
				});
				await expect(
					node._transport.handleEventPostTransaction({ transaction: tx }),
				).resolves.toEqual(
					expect.objectContaining({
						message: expect.stringContaining('Transaction was rejected'),
					}),
				);
			});
		});
	});

	describe('given a block containing disallowed transaction', () => {
		describe('when the block is processed', () => {
			let newBlock;
			beforeAll(async () => {
				const genesisAccount = await node._chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const aCustomTransation = new CustomTransationClass({
					senderPublicKey: genesis.publicKey,
					nonce: genesisAccount.nonce.toString(),
					type: 7,
					asset: {
						data: 'raw data',
					},
					fee: (10000000).toString(),
				});
				aCustomTransation.sign(node._networkIdentifier, genesis.passphrase);
				newBlock = await nodeUtils.createBlock(node, [aCustomTransation]);
			});

			it('should be rejected', async () => {
				await expect(node._processor.process(newBlock)).rejects.toMatchObject([
					expect.objectContaining({
						message: expect.stringContaining('is currently not allowed'),
					}),
				]);
			});
		});
	});
});
