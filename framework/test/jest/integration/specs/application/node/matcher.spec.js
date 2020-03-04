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
 */

'use strict';

const {
	BaseTransaction,
	TransferTransaction,
} = require('@liskhq/lisk-transactions');
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
		networkIdentifier,
		type: 7,
		nonce,
		senderPublicKey,
		asset: {
			data: 'raw data',
		},
		fee: (10000000).toString(),
	});
	aCustomTransation.sign(passphrase);

	return aCustomTransation.toJSON();
};

describe('Matcher', () => {
	const dbName = 'transaction_matcher';
	let storage;
	let node;

	beforeAll(async () => {
		storage = new storageUtils.StorageSandbox(
			configUtils.storageConfig({ database: dbName }),
			dbName,
		);
		await storage.bootstrap();
		node = await nodeUtils.createAndLoadNode(storage);
		await node.forger.loadDelegates();
	});

	afterAll(async () => {
		await node.cleanup();
		await storage.cleanup();
	});

	describe('given a disallowed transaction', () => {
		describe('when transaction is pass to node', () => {
			it('should be rejected', async () => {
				const account = nodeUtils.createAccount();
				const tx = createRawCustomTransaction({
					passphrase: account.passphrase,
					networkIdentifier: node.networkIdentifier,
					senderPublicKey: account.publicKey,
					nonce: '0',
				});
				await expect(
					node.transport.handleEventPostTransaction({ transaction: tx }),
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
				const genesisAccount = await node.chain.dataAccess.getAccountByAddress(
					genesis.address,
				);
				const aCustomTransation = new CustomTransationClass({
					networkIdentifier: node.networkIdentifier,
					senderPublicKey: genesis.publicKey,
					nonce: genesisAccount.nonce.toString(),
					type: 7,
					asset: {
						data: 'raw data',
					},
					fee: (10000000).toString(),
				});
				aCustomTransation.sign(genesis.passphrase);
				newBlock = await nodeUtils.createBlock(node, [aCustomTransation]);
			});

			it('should be rejected', async () => {
				await expect(node.processor.process(newBlock)).rejects.toEqual(
					expect.objectContaining({
						message: expect.stringContaining('Transaction type not found'),
					}),
				);
			});
		});
	});
});
