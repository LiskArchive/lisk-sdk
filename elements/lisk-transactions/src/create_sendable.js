const { validateAddress, validatePublicKey } = require('@liskhq/lisk-validator');
const { getAddressFromPublicKey, getPrivateAndPublicKeyBytesFromPassphrase } = require('@liskhq/lisk-cryptography');

const validateRequiredInputs = (
		type,
		passphrase,
		recipientId = undefined,
		recipientPublicKey = undefined,
) => {

		if (!(recipientId || recipientPublicKey)) {
				throw new Error(
						'Either recipientId or recipientPublicKey must be provided.',
				);
		}

		if (typeof recipientId !== 'undefined') {
				validateAddress(recipientId);
		}

		if (typeof recipientPublicKey !== 'undefined') {
				validatePublicKey(recipientPublicKey);
		}

		if (
				recipientId &&
				recipientPublicKey &&
				recipientId !== getAddressFromPublicKey(recipientPublicKey)
		) {
				throw new Error('recipientId does not match recipientPublicKey.');
		}

		if (!passphrase) {
				throw new Error(
						"Cannot sign a transaction without a passphrase. Specify your passphrase as in the input object (and optional second passphrase)"
				);
		}

		if (!type || typeof type !== 'number') {
				throw new Error(
						'type must be provided.',
				);
		}
};

module.exports = (Transaction, inputs) => {
		const type = Transaction.TYPE;
		const {
				data,
				amount,
				asset,
				fee,
				recipientId,
				recipientPublicKey,
				senderPublicKey,
				passphrase,
				secondPassphrase,
				timestamp,
		} = inputs;

		validateRequiredInputs(type, passphrase, recipientId, recipientPublicKey);

		inputs.timestamp = inputs.timestamp || 0;
		const recipientIdFromPublicKey = recipientPublicKey
				? getAddressFromPublicKey(recipientPublicKey)
				: undefined;

		inputs.recipientId = recipientIdFromPublicKey
				? recipientIdFromPublicKey
				: inputs.recipientId;


		if (!passphrase) {
				throw "Cannot sign a transaction without a passphrase. Specify your passphrase as in the input object (and optional second passphrase)";
		}

		const senderKeyPair = getPrivateAndPublicKeyBytesFromPassphrase(inputs.passphrase);

		const transaction = new Transaction(
				{
						asset: data ? { data } : asset,
						amount,
						fee,
						recipientId,
						senderPublicKey: senderPublicKey || Buffer.from(senderKeyPair.publicKeyBytes).toString('hex'),
						type,
						timestamp: timestamp || 0,
				}
		);

		transaction.sign(passphrase, secondPassphrase);

		return asJSON(skipUndefined(transaction.toJSON()));
};

function asJSON (transaction) {
		return JSON.stringify(transaction);
}

function skipUndefined (transaction) {
		return Object.keys(transaction).reduce((transactionWithValues, property) => {
				if (transaction[property] !== undefined) {
						transactionWithValues[property] = transaction[property];
				}
				return transactionWithValues;
		}, {});
}
