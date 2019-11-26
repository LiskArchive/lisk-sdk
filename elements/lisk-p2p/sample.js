const {
	P2P,
	EVENT_MESSAGE_RECEIVED,
	EVENT_REQUEST_RECEIVED,
} = require('./src');

const p2p = new P2P({
	seedPeers: [
		{
			ipAddress: '127.0.0.1',
			wsPort: 5000,
		},
	],
	nodeInfo: {
		broadhash:
			'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
		nethash: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
		wsPort: 7000,
		protocolVersion: '1.1',
	},
});

const client = new P2P({
	seedPeers: [
		{
			ipAddress: '127.0.0.1',
			wsPort: 5000,
		},
	],
	maxInboundConnections: 0,
	nodeInfo: {
		broadhash:
			'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
		nethash: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
		wsPort: 7001,
		protocolVersion: '1.1',
	},
});

(async () => {
	await p2p.start();
	await new Promise(resolve => setTimeout(resolve, 2000));
	await client.start();
	console.log('started');
	await new Promise(resolve => setTimeout(resolve, 2000));
	while (true) {
		try {
			const res = await client.request({ procedure: 'getLastBlock' });
			console.log(res.data);
		} catch (err) {
			console.error(err);
		}

		await new Promise(resolve => setTimeout(resolve, 2000));
	}
})();
