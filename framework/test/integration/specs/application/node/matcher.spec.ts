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

import { BaseTransaction, TransactionError } from '@liskhq/lisk-transactions';
import { KVStore } from '@liskhq/lisk-db';
import { Block } from '@liskhq/lisk-chain';
import { nodeUtils } from '../../../../utils';
import { genesis } from '../../../../fixtures';
import { createDB, removeDB } from '../../../../utils/kv_store';
import { Node } from '../../../../../src/application/node';

/**
 * Implementation of the Custom Transaction enclosed in a class
 */
class CustomTransationClass extends BaseTransaction {
	public static ASSET_SCHEMA = {
		$id: 'basic-sample',
		type: 'object',
		properties: {
			foo: {
				dataType: 'string',
				fieldNumber: 1,
			},
		},
	};
	public asset: any;

	public constructor(input: any) {
		super(input);
		this.asset = input.asset;
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get TYPE(): number {
		return 7;
	}

	public assetToJSON() {
		return this.asset;
	}

	// eslint-disable-next-line class-methods-use-this
	public assetToBytes() {
		return Buffer.alloc(0);
	}

	// eslint-disable-next-line
	public async applyAsset(): Promise<TransactionError[]> {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public matcher() {
		return false;
	}

	// eslint-disable-next-line class-methods-use-this
	public validateAsset() {
		return [];
	}
}

interface CreateRawTransactionInput {
	passphrase: string;
	nonce: bigint;
	networkIdentifier: Buffer;
	senderPublicKey: Buffer;
}

const createRawCustomTransaction = ({
	passphrase,
	nonce,
	networkIdentifier,
	senderPublicKey,
}: CreateRawTransactionInput) => {
	const aCustomTransation = new CustomTransationClass({
		type: 7,
		nonce,
		senderPublicKey,
		asset: {
			data: 'raw data',
		},
		fee: BigInt(10000000),
	});
	aCustomTransation.sign(networkIdentifier, passphrase);

	return aCustomTransation;
};

describe('Matcher', () => {
	const dbName = 'transaction_matcher';
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
		await node['_forger'].loadDelegates();
	});

	afterAll(async () => {
		await forgerDB.clear();
		await node.cleanup();
		await blockchainDB.close();
		await forgerDB.close();
		removeDB(dbName);
	});

	describe('given a disallowed transaction', () => {
		describe('when transaction is pass to node', () => {
			it('should be rejected', async () => {
				const account = nodeUtils.createAccount();
				const tx = createRawCustomTransaction({
					passphrase: account.passphrase,
					networkIdentifier: node['_networkIdentifier'],
					senderPublicKey: account.publicKey,
					nonce: BigInt(0),
				});
				await expect(
					node['_transport'].handleEventPostTransaction({
						transaction: tx.getBytes().toString('base64'),
					}),
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
			let newBlock: Block;
			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress(genesis.address);
				const aCustomTransation = new CustomTransationClass({
					senderPublicKey: genesis.publicKey,
					nonce: genesisAccount.nonce,
					type: 7,
					asset: {
						data: 'raw data',
					},
					fee: BigInt(10000000),
				});
				aCustomTransation.sign(node['_networkIdentifier'], genesis.passphrase);
				newBlock = await nodeUtils.createBlock(node, [aCustomTransation]);
			});

			it('should be rejected', async () => {
				await expect(
					node['_processor'].process(newBlock),
				).rejects.toMatchObject([
					expect.objectContaining({
						message: expect.stringContaining('is currently not allowed'),
					}),
				]);
			});
		});
	});
});
