/*
 * Copyright © 2019 Lisk Foundation
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

/* eslint-disable mocha/no-pending-tests */
const { promisify } = require('util');
const {
	getAddressAndPublicKeyFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const randomstring = require('randomstring');
const {
	BaseTransaction,
	TransferTransaction,
	transfer,
} = require('@liskhq/lisk-transactions');
const { Slots } = require('@liskhq/lisk-blocks');
const {
	addTransaction,
	forge: commonForge,
	getDelegateForSlot,
	createValidBlock: createBlock,
} = require('./common');
const localCommon = require('./common');
const accountFixtures = require('../../fixtures/accounts');
const randomUtil = require('../../utils/random');
const { getNetworkIdentifier } = require('../../utils/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const slots = new Slots({
	epochTime: __testContext.config.constants.EPOCH_TIME,
	interval: __testContext.config.constants.BLOCK_TIME,
});

// Promisify callback functions
const forge = promisify(commonForge);
const addTransactionPromisified = promisify(addTransaction);
// Constants
const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
const { MAX_TRANSACTIONS_PER_BLOCK } = global.constants;
/**
 * The type identifier of the Custom Transaction
 * @type {number}
 */
const CUSTOM_TRANSACTION_TYPE = 7;

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

/**
 * Create and sign a CustomTransaction and format it as JSON so it can be send
 * throughout the network.
 * @param passphrase
 * @param senderId
 * @param senderPublicKey
 * @returns {TransactionJSON}
 */
function createRawCustomTransaction({ passphrase, senderId, senderPublicKey }) {
	const aCustomTransation = new CustomTransationClass({
		networkIdentifier,
		type: 7,
		senderId,
		senderPublicKey,
		asset: {
			data: randomstring.generate({
				length: 10,
				charset: 'alphabetic',
				capitalization: 'lowercase',
			}),
		},
		fee: (10000000).toString(),
		timestamp: Math.floor((new Date().getTime() - EPOCH_TIME.getTime()) / 1000),
	});
	aCustomTransation.sign(passphrase);

	return aCustomTransation.toJSON();
}

async function createRawBlock(library, rawTransactions) {
	const lastBlock = library.modules.blocks.lastBlock;
	const slot = slots.getSlotNumber();
	const keypairs = library.modules.forger.getForgersKeyPairs();
	const transactions = rawTransactions.map(rawTransaction =>
		library.modules.blocks.deserializeTransaction(rawTransaction),
	);

	const delegateKey = await new Promise((resolve, reject) => {
		getDelegateForSlot(library, slot, (err, res) => {
			if (err) {
				return reject(err);
			}
			return resolve(res);
		});
	});

	const blockProcessorV1 = library.modules.processor.processors[1];
	const block = await blockProcessorV1.create.run({
		blockReward: library.modules.blocks.blockReward,
		keypair: keypairs[delegateKey],
		timestamp: slots.getSlotTime(slot),
		previousBlock: lastBlock,
		transactions,
		maxTransactionPerBlock:
			library.modules.blocks.constants.maxTransactionPerBlock,
		maxHeightPreviouslyForged: 1,
		maxHeightPrevoted: 1,
	});

	block.transactions = block.transactions.map(transaction =>
		transaction.toJSON(),
	);

	return block;
}

function setMatcherAndRegisterTx(scope, transactionClass, matcher) {
	Object.defineProperty(transactionClass.prototype, 'matcher', {
		get: () => matcher,
		configurable: true,
	});

	scope.modules.blocks._transactionAdapter._transactionClassMap.set(
		CUSTOM_TRANSACTION_TYPE,
		CustomTransationClass,
	);
}

describe('matcher', () => {
	let scope;
	let transactionPool;
	const randomAccount = randomUtil.account();
	const genesisAccount = {
		passphrase: accountFixtures.genesis.passphrase,
		...getAddressAndPublicKeyFromPassphrase(accountFixtures.genesis.passphrase),
	};
	const commonTransactionData = {
		passphrase: genesisAccount.passphrase,
		recipientId: randomAccount.address,
		senderId: genesisAccount.address,
		senderPublicKey: genesisAccount.publicKey,
	};

	localCommon.beforeBlock('lisk_test_integration_matcher', lib => {
		scope = lib;
		scope.config.broadcasts.active = true;

		/* TODO: [BUG] There is a current restriction on transaction type and it cannot
		be bigger than 7, so for this tests transaction type 7 can be removed from
		registered transactions map so the CustomTransaction can be added with that
		id. Type 7 is not used anyways. */
		scope.modules.blocks._transactionAdapter._transactionClassMap.delete(7);
		transactionPool = scope.modules.transactionPool;

		// Define matcher property to be configurable so it can be overriden in the tests
		setMatcherAndRegisterTx(scope, CustomTransationClass, () => {});
	});

	afterEach(async () => {
		// Delete the custom transaction type from the registered transactions list
		// So it can be registered again with the same type and maybe a different implementation in a different test.
		scope.modules.blocks._transactionAdapter._transactionClassMap.delete(
			CUSTOM_TRANSACTION_TYPE,
		);

		// Reset transaction pool so it starts fresh back again with no transactions.
		transactionPool._resetPool();

		// Delete all blocks and set lastBlock back to the genesisBlock.
		try {
			await scope.components.storage.entities.Block.begin(t => {
				return t.batch([
					scope.components.storage.adapter.db.none(
						'DELETE FROM blocks WHERE "height" > 1;',
					),
				]);
			});
			scope.modules.blocks._lastBlock = __testContext.config.genesisBlock;
		} catch (err) {
			__testContext.debug(err.stack);
		}
	});

	describe('when receiving transactions from a peer', () => {
		it('should not include a disallowed transaction in the transaction pool', async () => {
			// Arrange
			// Force the matcher function to return always _FALSE_, for easy testing
			// and register the transaction
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => false);

			const rawTransaction = createRawCustomTransaction(commonTransactionData);

			try {
				// Act: simulate receiving transactions from another peer
				await scope.modules.transport._receiveTransaction(rawTransaction);

				// Forces the test to fail if `receiveTransaction` doesn't throw
				throw [new Error('receiveTransaction was not rejected')];
			} catch (err) {
				// Assert
				expect(
					scope.modules.transactionPool.transactionInPool(rawTransaction.id),
				).to.be.false;
				expect(err).to.be.instanceOf(Error);
				expect(err.message).to.contain(
					`Transaction type ${CUSTOM_TRANSACTION_TYPE} is currently not allowed.`,
				);
			}
		});

		it('should include an allowed transaction in the transaction pool', async () => {
			// Arrange
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => true);
			const jsonTransaction = createRawCustomTransaction(commonTransactionData);
			// Act
			await scope.modules.transport._receiveTransaction(jsonTransaction);

			// Assert
			expect(
				scope.modules.transactionPool.transactionInPool(jsonTransaction.id),
			).to.be.true;
		});
	});

	describe('when receiving a block from another peer', () => {
		it('should reject the block if it contains disallowed transactions for the given block context', async () => {
			// Arrange
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => false);
			const jsonTransaction = createRawCustomTransaction(commonTransactionData);
			const rawBlock = await createRawBlock(scope, [jsonTransaction]);
			try {
				await scope.modules.blocks.receiveBlockFromNetwork(rawBlock);
			} catch (err) {
				// Expected err
			}
			expect(scope.modules.blocks.lastBlock.height).to.equal(1);
		});

		it('should accept the block if it contains allowed transactions for the given block context', async () => {
			// Arrange
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => true);
			const jsonTransaction = createRawCustomTransaction(commonTransactionData);

			// TODO: Actually create
			const newBlock = await new Promise((resolve, reject) => {
				createBlock(scope, [jsonTransaction], (err, block) => {
					if (err) {
						return reject(err);
					}
					return resolve(block);
				});
			});
			await scope.modules.processor.process(newBlock);
			expect(scope.modules.blocks.lastBlock.height).to.equal(2);
		});
	});

	describe('when forging a new block', () => {
		describe('when transaction pool is full and current context (last block height) at forging time, no longer matches the transaction matcher', () => {
			it('should not include the transaction in a new block if it is not allowed anymore', async () => {
				// Arrange
				// Transaction is only allowed it last block height is < 2
				setMatcherAndRegisterTx(
					scope,
					CustomTransationClass,
					({ blockHeight }) => blockHeight < 2,
				);

				const jsonTransaction = createRawCustomTransaction(
					commonTransactionData,
				);

				// Populate transaction pool with more transactions so we can delay applying the custom transaction
				const addTransactionsToPoolSteps = Array(MAX_TRANSACTIONS_PER_BLOCK)
					.fill()
					.map((_, i) => {
						const dummyTransferTransaction = transfer({
							networkIdentifier,
							amount: '1',
							data: i.toString(),
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: randomAccount.address,
						});
						return addTransactionPromisified(scope, dummyTransferTransaction);
					});

				// Wait until the pool is populated with other transactions
				await Promise.all(addTransactionsToPoolSteps);

				// Add transaction to the transaction pool. It will be added as
				// the matcher will return true given the current block height is 1 (genesisBlock)
				await addTransactionPromisified(scope, jsonTransaction);

				// Forge dummy transactions. Height will be 2.
				await forge(scope);

				// Attempt to forge again and include CustomTransaction in the block.
				await forge(scope);

				const lastBlock = scope.modules.blocks.lastBlock;
				expect(
					lastBlock.transactions.some(
						transation => transation.id === jsonTransaction.id,
					),
				).to.be.false;
				expect(lastBlock.transactions.length).to.equal(0);
			});
		});

		it('should include allowed transactions in the block', async () => {
			// Arrange
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => true);
			const jsonTransaction = createRawCustomTransaction(commonTransactionData);

			// Add transaction to the transaction pool.
			await addTransactionPromisified(scope, jsonTransaction);

			// Act: forge
			await forge(scope);

			const lastBlock = scope.modules.blocks.lastBlock;
			expect(
				lastBlock.transactions.some(
					transation => transation.id === jsonTransaction.id,
				),
			).to.be.true;
		});
	});
});
