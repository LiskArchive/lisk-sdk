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
const {
	addTransaction,
	forge: commonForge,
	getDelegateForSlot,
	createValidBlock: createBlock,
} = require('./common');
const commonApplication = require('../common/application');
const accountFixtures = require('../fixtures/accounts');
const randomUtil = require('../common/utils/random');
const slots = require('../../../src/modules/chain/helpers/slots');

// Promisify callback functions
const forge = promisify(commonForge);
const addTransactionPromisified = promisify(addTransaction);
const application = {
	init: promisify(commonApplication.init),
	cleanup: promisify(commonApplication.cleanup),
};
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

function createRawBlock(library, rawTransactions, callback) {
	const lastBlock = library.modules.blocks.lastBlock.get();
	const slot = slots.getSlotNumber();
	const keypairs = library.modules.delegates.getForgersKeyPairs();
	const transactions = rawTransactions.map(rawTransaction =>
		library.logic.initTransaction.fromJson(rawTransaction)
	);

	return getDelegateForSlot(library, slot, (err, delegateKey) => {
		if (err) return callback(err);

		const block = library.logic.block.create({
			keypair: keypairs[delegateKey],
			timestamp: slots.getSlotTime(slot),
			previousBlock: lastBlock,
			transactions,
		});

		block.id = library.logic.block.getId(block);
		block.height = lastBlock.height + 1;
		block.transactions = block.transactions.map(transaction =>
			transaction.toJSON()
		);
		return callback(null, block);
	});
}

function setMatcherAndRegisterTx(scope, transactionClass, matcher) {
	Object.defineProperty(transactionClass.prototype, 'matcher', {
		get: () => matcher,
		configurable: true,
	});

	scope.logic.initTransaction.transactionClassMap.set(
		CUSTOM_TRANSACTION_TYPE,
		CustomTransationClass
	);
}

describe('matcher', () => {
	let scope;
	let transactionPool;
	let receiveTransaction;
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

	before(async () => {
		TransferTransaction.matcher = () => false;

		scope = await application.init({
			sandbox: {
				name: 'lisk_test_integration_matcher',
			},
			scope: {
				config: {
					broadcasts: {
						active: true,
					},
				},
			},
		});

		scope.config.broadcasts.active = true;
		/* TODO: [BUG] There is a current restriction on transaction type and it cannot
		be bigger than 7, so for this tests transaction type 7 can be removed from
		registered transactions map so the CustomTransaction can be added with that
		id. Type 7 is not used anyways. */
		scope.logic.initTransaction.transactionClassMap.delete(7);
		receiveTransaction = scope.rewiredModules.transport.__get__(
			'__private.receiveTransaction'
		);
		transactionPool = scope.rewiredModules.transactions.__get__(
			'__private.transactionPool'
		);

		// Define matcher property to be configurable so it can be overriden in the tests
		setMatcherAndRegisterTx(scope, CustomTransationClass, () => {});
	});

	after(() => {
		return application.cleanup();
	});

	afterEach(async () => {
		// Delete the custom transaction type from the registered transactions list
		// So it can be registered again with the same type and maybe a different implementation in a different test.
		scope.logic.initTransaction.transactionClassMap.delete(
			CUSTOM_TRANSACTION_TYPE
		);

		// Reset transaction pool so it starts fresh back again with no transactions.
		transactionPool.resetPool();

		// Delete all blocks and set lastBlock back to the genesisBlock.
		try {
			await scope.components.storage.entities.Block.begin(t => {
				return t.batch([
					scope.components.storage.adapter.db.none(
						'DELETE FROM blocks WHERE "height" > 1;'
					),
					scope.components.storage.adapter.db.none('DELETE FROM forks_stat;'),
				]);
			});
			scope.modules.blocks.lastBlock.set(__testContext.config.genesisBlock);
		} catch (err) {
			__testContext.debug(err.stack);
		}
	});

	describe('when receiving transactions from a peer', () => {
		it('should not include a disallowed transaction in the transaction pool', done => {
			// Arrange
			// Force the matcher function to return always _FALSE_, for easy testing
			// and register the transaction
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => false);

			const rawTransaction = createRawCustomTransaction(commonTransactionData);

			// Act: simulate receiving transactions from another peer
			receiveTransaction(rawTransaction, null, err => {
				// Assert
				expect(scope.modules.transactions.transactionInPool(rawTransaction.id))
					.to.be.false;
				expect(err[0]).to.be.instanceOf(Error);
				expect(err[0].message).to.equal(
					`Transaction type ${CUSTOM_TRANSACTION_TYPE} is currently not allowed.`
				);
				done();
			});
		});

		it('should include an allowed transaction in the transaction pool', done => {
			// Arrange
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => true);

			const jsonTransaction = createRawCustomTransaction(commonTransactionData);
			// Act
			receiveTransaction(jsonTransaction, null, err => {
				// Assert
				expect(scope.modules.transactions.transactionInPool(jsonTransaction.id))
					.to.be.true;
				expect(err).to.be.null;
				done();
			});
		});
	});

	describe('when receiving a block from another peer', () => {
		it('should reject the block if it contains disallowed transactions for the given block context', done => {
			// Arrange
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => false);
			const jsonTransaction = createRawCustomTransaction(commonTransactionData);
			createRawBlock(scope, [jsonTransaction], (err, rawBlock) => {
				if (err) {
					return done(err);
				}

				// Act: Simulate receiving a block from a peer
				scope.modules.blocks.process.onReceiveBlock(rawBlock);
				return scope.sequence.__tick(tickErr => {
					if (tickErr) {
						return done(tickErr);
					}
					// Assert: received block should be accepted and set as the last block
					expect(scope.modules.blocks.lastBlock.get().height).to.equal(1);

					return done();
				});
			});
		});

		it('should accept the block if it contains allowed transactions for the given block context', done => {
			// Arrange
			setMatcherAndRegisterTx(scope, CustomTransationClass, () => true);
			const jsonTransaction = createRawCustomTransaction(commonTransactionData);

			// TODO: Actually create

			createBlock(scope, [jsonTransaction], (err, block) => {
				if (err) {
					return done(err);
				}

				// Act: Simulate receiving a block from a peer
				scope.modules.blocks.process.onReceiveBlock(block);
				return scope.sequence.__tick(tickErr => {
					if (tickErr) {
						return done(tickErr);
					}

					// Assert: received block should be accepted and set as the last block
					expect(scope.modules.blocks.lastBlock.get().height).to.equal(2);

					return done();
				});
			});
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
					({ blockHeight }) => blockHeight < 2
				);

				const jsonTransaction = createRawCustomTransaction(
					commonTransactionData
				);

				// Populate transaction pool with more transactions so we can delay applying the custom transaction
				const addTransactionsToPoolSteps = Array(MAX_TRANSACTIONS_PER_BLOCK)
					.fill()
					.map((_, i) => {
						const dummyTransferTransaction = transfer({
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

				const lastBlock = scope.modules.blocks.lastBlock.get();
				expect(
					lastBlock.transactions.some(
						transation => transation.id === jsonTransaction.id
					)
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

			const lastBlock = scope.modules.blocks.lastBlock.get();
			expect(
				lastBlock.transactions.some(
					transation => transation.id === jsonTransaction.id
				)
			).to.be.true;
		});
	});
});
