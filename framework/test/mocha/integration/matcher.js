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
const { addTransaction, forge } = require('./common');
const application = require('../common/application');
const accountFixtures = require('../fixtures/accounts');
const randomUtil = require('../common/utils/random');

const forgePromisified = promisify(forge);
const addTransactionPromisified = promisify(addTransaction);
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
		this.type = CUSTOM_TRANSACTION_TYPE;
		this.asset = input.asset;
	}

	// eslint-disable-next-line class-methods-use-this
	assetToJSON() {
		return this.asset;
	}

	// eslint-disable-next-line class-methods-use-this,no-empty-function
	async prepare(store) {
		await store.account.cache([
			{
				address: this.senderId,
			},
			{
				address: this.recipientId,
			},
		]);
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
	validateAsset() {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	undoAsset() {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	verifyAgainstTransactions(transactions) {
		transactions.forEach(() => true);
		return [];
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
function createCustomTransactionJSON({
	passphrase,
	senderId,
	senderPublicKey,
}) {
	const aCustomTransation = new CustomTransationClass({
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

describe('matcher', () => {
	let scope;
	const randomAccount = randomUtil.account();
	let receiveTransaction;

	beforeEach(done => {
		TransferTransaction.matcher = () => false;
		application.init(
			{
				sandbox: {
					name: randomstring.generate({
						length: 10,
						charset: 'alphabetic',
						capitalization: 'lowercase',
					}),
				},
				scope: {
					config: {
						broadcasts: {
							active: true,
						},
					},
				},
			},
			(err, _scope) => {
				if (err) {
					return done(err);
				}
				_scope.config.broadcasts.active = true;
				// BUG: There is a current restriction on transaction type and it cannot
				// be bigger than 7, so for this tests transaction type 7 can be removed from
				// registered transactions map so the CustomTransaction can be added with that
				// id. Type 7 is not used anyways.
				_scope.logic.initTransaction.transactionClassMap.delete(7);
				receiveTransaction = _scope.rewiredModules.transport.__get__(
					'__private.receiveTransaction'
				);

				scope = _scope;

				return done();
			}
		);
	});

	afterEach(done => {
		// Delete the custom transaction type from the registered transactions list
		// So it can be registered again with the same type and maybe a different implementation in a different test.
		scope.logic.initTransaction.transactionClassMap.delete(
			CUSTOM_TRANSACTION_TYPE
		);

		application.cleanup(done);
	});

	describe('when receiving transactions from a peer', () => {
		it('should not include a disallowed transaction in the transaction pool', done => {
			// Arrange

			const passphrase = accountFixtures.genesis.passphrase;
			const { address, publicKey } = getAddressAndPublicKeyFromPassphrase(
				passphrase
			);

			const transactionData = {
				passphrase,
				recipientId: randomAccount.address,
				senderId: address,
				senderPublicKey: publicKey,
			};

			// Force the matcher function to return always _FALSE_, for easy testing
			CustomTransationClass.matcher = () => false;

			// Add the custom transactcion implementation to the list
			scope.logic.initTransaction.transactionClassMap.set(
				CUSTOM_TRANSACTION_TYPE,
				CustomTransationClass
			);

			const jsonTransaction = createCustomTransactionJSON(transactionData);

			// Act: simulate receiving transactions from another peer
			receiveTransaction(
				jsonTransaction,
				randomstring.generate(16),
				null,
				err => {
					// Assert: transaction shouldn't be included in the transaction pool
					expect(
						scope.modules.transactions.transactionInPool(jsonTransaction.id)
					).to.be.false;
					expect(err[0]).to.be.instanceOf(Error);
					expect(err[0].message).to.equal(
						`Transaction type ${CUSTOM_TRANSACTION_TYPE} is currently not allowed.`
					);
					done();
				}
			);
		});

		it('should include an allowed transaction in the transaction pool', done => {
			// Arrange
			const passphrase = accountFixtures.genesis.passphrase;
			const { address, publicKey } = getAddressAndPublicKeyFromPassphrase(
				passphrase
			);

			const transactionData = {
				passphrase,
				recipientId: randomAccount.address,
				senderId: address,
				senderPublicKey: publicKey,
			};

			// Force the matcher function to return always _TRUE_, for easy testing
			CustomTransationClass.matcher = () => true;

			// Add the custom transactcion implementation to the list
			scope.logic.initTransaction.transactionClassMap.set(
				CUSTOM_TRANSACTION_TYPE,
				CustomTransationClass
			);

			const jsonTransaction = createCustomTransactionJSON(transactionData);

			// Act: simulate receiving transactions from another peer
			receiveTransaction(
				jsonTransaction,
				randomstring.generate(16),
				null,
				err => {
					// Assert: transaction shouldn't be included in the transaction pool
					expect(
						scope.modules.transactions.transactionInPool(jsonTransaction.id)
					).to.be.true;
					expect(err).to.be.null;
					done();
				}
			);
		});
	});

	describe('when receiving a block from another peer', () => {
		it(
			'should reject the block if it contains disallowed transactions for the given block context'
		);

		it(
			'should accept the block if it contains allowed transactions for the given block context'
		);
	});

	describe('when forging a new block', () => {
		describe('when transaction pool is full and current context (last block height) no longer matches the transaction matcher', () => {
			it('should not include the transaction in a new block if it is not allowed anymore', async () => {
				const passphrase = accountFixtures.genesis.passphrase;
				const { address, publicKey } = getAddressAndPublicKeyFromPassphrase(
					passphrase
				);

				const transactionData = {
					passphrase,
					recipientId: randomAccount.address,
					senderId: address,
					senderPublicKey: publicKey,
				};

				// Transaction is only allowed it last block height is < 2
				CustomTransationClass.matcher = ({ blockHeight }) => blockHeight < 2;

				// Add the custom transactcion implementation to the list
				scope.logic.initTransaction.transactionClassMap.set(
					CUSTOM_TRANSACTION_TYPE,
					CustomTransationClass
				);

				const jsonTransaction = createCustomTransactionJSON(transactionData);

				// Add transaction to the transaction pool. It will be added as
				// the matcher will return true given the current block height is 1 (genesisBlock)
				await addTransactionPromisified(scope, jsonTransaction);

				// Populate transaction pool with more transactions so we can delay applying custom transaction
				const addTransactionsToPoolSteps = Array(MAX_TRANSACTIONS_PER_BLOCK + 5)
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

				// Forge dummy transactions. Height will be 2.
				await forgePromisified(scope);

				// Attempt to forge again and include CustomTransaction in the block.
				await forgePromisified(scope);

				const lastBlock = scope.modules.blocks.lastBlock.get();
				expect(
					lastBlock.transactions.some(
						transation => transation.id === jsonTransaction.id
					)
				).to.be.false;
				expect(lastBlock.transactions.length).to.equal(5);
			});
		});

		it('should include allowed transactions in the block', async () => {
			const passphrase = accountFixtures.genesis.passphrase;
			const { address, publicKey } = getAddressAndPublicKeyFromPassphrase(
				passphrase
			);

			const transactionData = {
				passphrase,
				recipientId: randomAccount.address,
				senderId: address,
				senderPublicKey: publicKey,
			};

			// Force the matcher function to return always _TRUE_, for easy testing
			CustomTransationClass.matcher = () => true;

			// Add the custom transactcion implementation to the list
			scope.logic.initTransaction.transactionClassMap.set(
				CUSTOM_TRANSACTION_TYPE,
				CustomTransationClass
			);

			const jsonTransaction = createCustomTransactionJSON(transactionData);

			// Add transaction to the transaction pool.
			await addTransactionPromisified(scope, jsonTransaction);

			// Forge
			await forgePromisified(scope);

			const lastBlock = scope.modules.blocks.lastBlock.get();
			expect(
				lastBlock.transactions.some(
					transation => transation.id === jsonTransaction.id
				)
			).to.be.true;
		});
	});
});
