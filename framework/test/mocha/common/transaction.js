const { utils: transactionUtils } = require('@liskhq/lisk-transactions');
const BigNumber = require('bignumber.js');

const createInvalidRegisterMultisignatureTransaction = ({
	keysgroup,
	lifetime,
	minimum,
	passphrase,
	secondPassphrase,
	baseFee,
}) =>
	transactionUtils.signRawTransaction({
		transaction: {
			type: 4,
			amount: '0',
			fee: new BigNumber(baseFee).times(keysgroup.length + 1).toString(),
			asset: {
				multisignature: {
					keysgroup: keysgroup.map(key => `+${key}`),
					lifetime,
					min: minimum,
				},
			},
		},
		passphrase,
		secondPassphrase,
	});

module.exports = {
	createInvalidRegisterMultisignatureTransaction,
};
