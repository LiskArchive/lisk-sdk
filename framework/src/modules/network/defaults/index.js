module.exports = {
	blacklistedPeers: [],
	connectTimeout: 5000,
	ackTimeout: 10000,
	discoveryInterval: 30000,
	seedPeers: [],
	wsEngine: 'ws',
	nodeInfo: {
		wsPort: 5001, // TODO: Change to 5000
		height: 0,
	},
};
