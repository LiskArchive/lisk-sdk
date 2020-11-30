/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const { P2P } = require('../../dist-node');
const { randomBytes } = require('crypto');

const cityRandom = () => {
	const CITIES = [
		'Aberdeen',
		'Abilene',
		'Akron',
		'Albany',
		'Albuquerque',
		'Alexandria',
		'Jefferson',
		'Jersey City',
		'Manchester',
		'Marina',
		'Marysville',
		'McAllen',
		'McHenry',
		'Medford',
		'Melbourne',
		'Murfreesboro',
		'Murrieta',
		'Muskegon',
		'Myrtle Beach',
		'Naperville',
		'Naples',
		'Nashua',
		'Nashville',
		'New Bedford',
		'New Haven',
		'New London',
		'New Orleans',
		'New York',
		'New York City',
		'Victorville',
		'Virginia Beach',
		'Visalia',
		'Waco',
		'Warren',
		'Washington',
		'West Valley City',
		'Wilmington',
		'Winston',
		'Winter Haven',
		'Worcester',
		'York',
		'Youngstown',
	];

	return CITIES[Math.floor(Math.random() * CITIES.length)];
};

const customNodeInfoSchema = {
	$id: '/nodeInfo/custom',
	type: 'object',
	properties: {
		module: {
			dataType: 'string',
			fieldNumber: 1,
		},
		city: {
			dataType: 'string',
			fieldNumber: 2,
		},
		found: {
			dataType: 'boolean',
			fieldNumber: 3,
		},
	},
};

// Instantiate a P2P instance
/**
 * @description To start a p2p instance and listen to various events
 */
const run = async (port, peers, city) => {
	const nodeInfo = {
		nonce: randomBytes(8).toString('hex'),
		networkIdentifier: '123456',
		networkVersion: '1.1',
		advertiseAddress: false,
		options: {
			module: 'randomWorld',
			city, // Assign random city in the beginning
			found: false,
		},
	};

	const p2pConfig = {
		port,
		maxOutboundConnections: 5,
		maxInboundConnections: 10,
		customNodeInfoSchema,
		previousPeers: peers,
		nodeInfo,
	};

	const p2p = new P2P(p2pConfig);
	// Start the P2P instance
	await p2p.start();

	console.log(
		`P2P node with nonce "${nodeInfo.nonce}" is running successfully at port ${p2pConfig.port}`,
	);

	p2p.on('error', console.log);

	return new Promise(resolve => {
		resolve(p2p);
	});
};

module.exports = {
	run,
	cityRandom,
};
