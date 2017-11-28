'use strict';

module.exports = {
	network: {
		peers: require('./network/peers')
	},
	propagation: {
		blocks: require('./propagation/blocks'),
		transactions: require('./propagation/transactions')
	}
};
