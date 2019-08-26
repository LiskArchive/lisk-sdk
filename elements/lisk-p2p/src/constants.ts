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
import { getRandomBytes } from '@liskhq/lisk-cryptography';

// General P2P constants
export const DEFAULT_NODE_HOST_IP = '0.0.0.0';
export const DEFAULT_BAN_TIME = 86400;
export const DEFAULT_POPULATOR_INTERVAL = 10000;
export const DEFAULT_SEND_PEER_LIMIT = 25;
// Max rate of WebSocket messages per second per peer.
export const DEFAULT_WS_MAX_MESSAGE_RATE = 100;
export const DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY = 10;
export const DEFAULT_RATE_CALCULATION_INTERVAL = 1000;
export const DEFAULT_WS_MAX_PAYLOAD = 3048576; // Size in bytes
const SECRET_BYTE_LENGTH = 4;
export const DEFAULT_RANDOM_SECRET = getRandomBytes(
	SECRET_BYTE_LENGTH,
).readUInt32BE(0);
export const BASE_10_RADIX = 10;

export const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
export const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
export const DEFAULT_OUTBOUND_SHUFFLE_INTERVAL = 300000;
export const DEFAULT_PEER_PROTECTION_FOR_NETGROUP = 0.034;
export const DEFAULT_PEER_PROTECTION_FOR_LATENCY = 0.068;
export const DEFAULT_PEER_PROTECTION_FOR_USEFULNESS = 0.068;
export const DEFAULT_PEER_PROTECTION_FOR_LONGEVITY = 0.5;
export const DEFAULT_MIN_PEER_DISCOVERY_THRESHOLD = 100;
export const DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH = 1000;
export const DEFAULT_MAX_PEER_INFO_SIZE = 20480; // Size in bytes

// Peer pool constants
export const INTENTIONAL_DISCONNECT_STATUS_CODE = 1000;

// Peer base constants
export const DEFAULT_CONNECT_TIMEOUT = 2000;
export const DEFAULT_ACK_TIMEOUT = 2000;
export const DEFAULT_REPUTATION_SCORE = 100;
export const DEFAULT_PRODUCTIVITY_RESET_INTERVAL = 20000;
export const DEFAULT_PRODUCTIVITY = {
	requestCounter: 0,
	responseCounter: 0,
	responseRate: 0,
	lastResponded: 0,
};

// Peer inbound constants
export const DEFAULT_PING_INTERVAL_MAX = 60000;
export const DEFAULT_PING_INTERVAL_MIN = 20000;

// Peer directory constants
export const DEFAULT_NEW_PEER_BUCKET_COUNT = 128;
export const DEFAULT_NEW_PEER_BUCKET_SIZE = 32;
export const DEFAULT_EVICTION_THRESHOLD_TIME = 86400000; // Milliseconds in a day -> hours*minutes*seconds*milliseconds;
export const DEFAULT_TRIED_PEER_LIST_SIZE = 64;
export const DEFAULT_TRIED_PEER_BUCKET_SIZE = 32;
export const DEFAULT_MAX_RECONNECT_TRIES = 3;
