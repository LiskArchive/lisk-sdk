'use strict';

module.exports = {
	network: {
		peers: require('./network/peers')
	},
	propagation: {
		blocks: require('./propagation/blocks'),
		transactions: require('./propagation/transactions')
	},
	stress: {
		transfer: require('./stress/0.transfer')
	}
};
