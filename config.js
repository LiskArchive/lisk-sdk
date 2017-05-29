const config = {};

config.json = false;
config.liskJS = {
	//ssl: false, // Default false. Set to true to enable the https instead of http protocol.
	//node: '', // Default randomNode. Insert a node without http or https protocol. Use ssl option in order to set http or https.
	//randomPeer: true, // Default true. Lisk-js automatically connects to a random peer to get lisk blockchain information. Set to false to disable this behaviour.
	testnet: false, // Default false. Set to true to use the testnet. Set to false to use the mainnet.
	//port: '7000', // Default 8000. Enter the port as the protocol http(s)://node:port - can be any string.
	//bannedPeers: [], // Default empty. Array of peers that should not be connected to. Without http(s) or port.
};

module.exports = config;