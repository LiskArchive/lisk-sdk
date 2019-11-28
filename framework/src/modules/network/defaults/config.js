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

const defaultConfig = {
	type: 'object',
	properties: {
		wsPort: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			env: 'LISK_WS_PORT',
			arg: '--port,-p',
		},
		hostIp: {
			type: 'string',
			format: 'ip',
			env: 'LISK_ADDRESS',
			arg: '--address,-a',
		},
		seedPeers: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					ip: {
						type: 'string',
						format: 'ipOrFQDN',
					},
					wsPort: {
						type: 'integer',
						minimum: 1,
						maximum: 65535,
					},
				},
			},
			env: { variable: 'LISK_PEERS', formatter: 'stringToIpPortSet' },
			arg: { name: '--peers,-x', formatter: 'stringToIpPortSet' }, // TODO: Need to confirm parsing logic, old logic was using network WSPort to be default port for peers, we don't have it at the time of compilation
		},
		blacklistedPeers: {
			type: 'array',
			items: {
				type: 'string',
				format: 'ip',
			},
		},
		// Warning! The connectivity of the node might be negatively impacted if using this option.
		fixedPeers: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					ip: {
						type: 'string',
						format: 'ip',
					},
					wsPort: {
						type: 'integer',
						minimum: 1,
						maximum: 65535,
					},
				},
			},
			maximum: 4,
			env: { variable: 'LISK_PEERS', formatter: 'stringToIpPortSet' },
			arg: { name: '--peers,-x', formatter: 'stringToIpPortSet' },
		},
		// Warning! Beware of declaring only trustworthy peers in this array as these could attack a
		// node with a denial-of-service attack because the banning mechanism is deactivated.
		whitelistedPeers: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					ip: {
						type: 'string',
						format: 'ip',
					},
					wsPort: {
						type: 'integer',
						minimum: 1,
						maximum: 65535,
					},
				},
			},
			env: { variable: 'LISK_PEERS', formatter: 'stringToIpPortSet' },
			arg: { name: '--peers,-x', formatter: 'stringToIpPortSet' },
		},
		peerBanTime: {
			type: 'integer',
		},
		populatorInterval: {
			type: 'integer',
		},
		connectTimeout: {
			type: 'integer',
		},
		ackTimeout: {
			type: 'integer',
		},
		maxOutboundConnections: {
			type: 'integer',
		},
		maxInboundConnections: {
			type: 'integer',
		},
		sendPeerLimit: {
			type: 'integer',
			minimum: 1,
			maximum: 100,
		},
		maxPeerDiscoveryResponseLength: {
			type: 'integer',
			maximum: 1000,
		},
		maxPeerInfoSize: {
			type: 'integer',
			maximum: 20480,
		},
		wsMaxPayload: {
			type: 'integer',
			maximum: 3048576,
		},
		outboundShuffleInterval: {
			type: 'integer',
		},
		advertiseAddress: {
			type: 'boolean',
		},
	},
	required: ['wsPort', 'seedPeers'],
	default: {
		wsPort: 5000,
		seedPeers: [],
	},
};

module.exports = defaultConfig;
