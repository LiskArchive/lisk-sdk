const { BaseTransaction } = require('@liskhq/lisk-transactions');
const randomstring = require('randomstring');
const { TransferTransaction } = require('@liskhq/lisk-transactions');
const application = require('../common/application');

const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));

const randomUtil = require('../common/utils/random');

/**
 * The type identifier of the Custom Transaction
 * @type {number}
 */
const CUSTOM_TRANSACTION_TYPE = 8;

/**
 * Implementation of the Custom Transaction enclosed in a class
 */
class CustomTransationClass extends BaseTransaction {
	constructor(...args) {
		super(...args);
		this.type = CUSTOM_TRANSACTION_TYPE;
		this.asset = {};
	}

	// eslint-disable-next-line class-methods-use-this
	assetToBytes() {
		return Buffer.alloc(0);
	}

	assetToJSON() {
		return this.asset;
	}

	static matcher() {
		return false;
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
		asset: {},
		timestamp: Math.floor((new Date().getTime() - EPOCH_TIME.getTime()) / 100),
	});
	aCustomTransation.sign(passphrase);

	return aCustomTransation.toJSON();
}

describe('matcher', () => {
	let scope;
	const randomAccount = randomUtil.account();

	before(done => {
		TransferTransaction.matcher = () => false;
		application.init(
			{
				sandbox: { name: 'matcher_integration_tests' },
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

				_scope.logic.initTransaction.transactionClassMap.set(
					CUSTOM_TRANSACTION_TYPE,
					CustomTransationClass
				);

				_scope.config.broadcasts.active = true;

				scope = _scope;

				return done();
			}
		);
	});

	it('should not include a disallowed transaction in the transaction pool', async () => {
		// Arrange
		const transactionData = {
			passphrase: randomAccount.passphrase,
			senderId: randomAccount.address,
			senderPublicKey: randomAccount.publicKey,
		};

		const jsonTransaction = createCustomTransactionJSON(transactionData);

		// Act: simulate receiving transactions from another peer
		scope.modules.transport.shared.postTransactions({
			transactions: [jsonTransaction],
			nonce: randomstring.generate(16),
		});

		// Assert: transaction shouldn't be included in the transaction pool
		expect(scope.modules.transactions.transactionInPool(jsonTransaction.id)).to
			.be.false;
	});
});
