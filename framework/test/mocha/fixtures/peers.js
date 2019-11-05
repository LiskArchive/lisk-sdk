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
 */

'use strict';

const randomstring = require('randomstring');
const faker = require('faker');
const stampit = require('stampit');

const NormalizedPeer = stampit({
	props: {
		height: 1,
		ip: '40.40.40.40',
		os: 'unknown',
		wsPort: 5000,
		httpPort: 4000,
		state: 2,
		version: '0.0.0',
		protocolVersion: '0.0',
		nonce: '',
	},
	init({ nonce }) {
		this.nonce = nonce || randomstring.generate(16);
	},
});

const Peer = stampit({
	props: {
		dappid: null,
		height: null,
		ip: '40.40.40.40',
		os: 'unknown',
		wsPort: null,
		httpPort: null,
		state: null,
		nonce: '',
		version: '',
		protocolVersion: '',
	},
	init({ nonce, state }) {
		this.dappid = null;
		this.height = parseInt(_.sample([50, 70, 90, 110]), 10);
		this.ip = faker.internet.ip();
		this.os = faker.lorem.slug();
		this.wsPort = `5${faker.random.number({ max: 999, min: 100 })}`;
		this.httpPort = `4${faker.random.number({ max: 999, min: 100 })}`;
		this.version = faker.system.semver();
		this.state = state || 2; // Connected Peer
		this.nonce = nonce || randomstring.generate(16);
	},
});

const DBPeer = stampit(Peer, {
	init() {
		delete this.dappid;
		delete this.httpPort;
		delete this.nonce;
		this.wsPort = parseInt(this.wsPort, 10);
	},
});

module.exports = {
	randomNormalizedPeer: new NormalizedPeer(),
	generateRandomActivePeer: Peer, // For backward compatibility
	Peer,
	DBPeer,
};
