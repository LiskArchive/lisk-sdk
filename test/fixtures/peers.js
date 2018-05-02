/*
 * Copyright © 2018 Lisk Foundation
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
		broadhash:
			'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
		height: 1,
		ip: '40.40.40.40',
		os: 'unknown',
		wsPort: 5000,
		httpPort: 4000,
		state: 2,
		version: '0.0.0',
		nonce: '',
	},
	init({ nonce }) {
		this.nonce = nonce || randomstring.generate(16);
	},
});

const Peer = stampit({
	props: {
		broadhash: '',
		dappid: null,
		height: null,
		ip: '40.40.40.40',
		os: 'unknown',
		wsPort: null,
		httpPort: null,
		state: null,
		nonce: '',
		version: '',
	},
	init({ broadhash, nonce, state }) {
		this.dappid = null;
		this.height = parseInt(_.sample([50, 70, 90, 110]));
		this.ip = faker.internet.ip();
		this.os = faker.lorem.slug();
		this.wsPort = `5${faker.random.number({ max: 999, min: 100 })}`;
		this.httpPort = `4${faker.random.number({ max: 999, min: 100 })}`;
		this.version = faker.system.semver();

		this.broadhash =
			broadhash ||
			randomstring.generate({
				charset: 'hex',
				length: 64,
				capitalization: 'lowercase',
			});
		this.state = state || 2; // Connected Peer
		this.nonce = nonce || randomstring.generate(16);
	},
});

const DBPeer = stampit(Peer, {
	props: {
		clock: '',
	},
	init() {
		this.clock = (+new Date() / 1000).toFixed();
		delete this.dappid;
		delete this.httpPort;
		delete this.nonce;
		this.wsPort = parseInt(this.wsPort);
	},
});

module.exports = {
	randomNormalizedPeer: NormalizedPeer(),
	generateRandomActivePeer: Peer, // For backward compatibility
	Peer,
	DBPeer,
};
