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
import { utils } from '@liskhq/lisk-cryptography';

// General P2P constants
export const DEFAULT_MESSAGE_ENCODING_FORMAT = 'base64';
export const DEFAULT_NODE_HOST_IP = '0.0.0.0';
export const DEFAULT_LOCALHOST_IP = '127.0.0.1';
export const DEFAULT_BAN_TIME = 86400000; // Milliseconds in a day -> hours*minutes*seconds*milliseconds
export const DEFAULT_POPULATOR_INTERVAL = 10000;
export const DEFAULT_FALLBACK_SEED_PEER_DISCOVERY_INTERVAL = 30000;
export const DEFAULT_SEND_PEER_LIMIT = 16;
// Max rate of WebSocket messages per second per peer.
export const DEFAULT_CONTROL_MESSAGE_LIMIT = 10;
export const DEFAULT_WS_MAX_MESSAGE_RATE = 100;
export const DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY = 10;
export const DEFAULT_RATE_CALCULATION_INTERVAL = 1000;
export const DEFAULT_WS_MAX_PAYLOAD = 3048576; // Size in bytes
export const DEFAULT_NONCE_LENGTH_BYTES = 8;
const SECRET_BYTE_LENGTH = 4;
export const DEFAULT_RANDOM_SECRET = utils.getRandomBytes(SECRET_BYTE_LENGTH).readUInt32BE(0);

export const DEFAULT_MAX_OUTBOUND_CONNECTIONS = 20;
export const DEFAULT_MAX_INBOUND_CONNECTIONS = 100;
export const DEFAULT_OUTBOUND_SHUFFLE_INTERVAL = 300000; // Milliseconds 5 minute
export const DEFAULT_PEER_PROTECTION_FOR_NETGROUP = 0.034;
export const DEFAULT_PEER_PROTECTION_FOR_LATENCY = 0.068;
export const DEFAULT_PEER_PROTECTION_FOR_USEFULNESS = 0.068;
export const DEFAULT_PEER_PROTECTION_FOR_LONGEVITY = 0.5;
export const DEFAULT_MIN_PEER_DISCOVERY_THRESHOLD = 100;
export const DEFAULT_MAX_PEER_DISCOVERY_RESPONSE_LENGTH = 200;
export const DEFAULT_MAX_PEER_INFO_SIZE = 20480; // Size in bytes
export const DEFAULT_MIN_TRIED_PEER_COUNT = 100;

// Peer base constants
export const DEFAULT_CONNECT_TIMEOUT = 2000;
export const DEFAULT_ACK_TIMEOUT = 2000;
export const DEFAULT_REPUTATION_SCORE = 100;
export const DEFAULT_PRODUCTIVITY_RESET_INTERVAL = 20000;
export const DEFAULT_PEER_STATUS_MESSAGE_RATE = 4; // Number of messages per 10 seconds
export const DEFAULT_PRODUCTIVITY = {
	requestCounter: 0,
	responseCounter: 0,
	responseRate: 0,
	lastResponded: 0,
};

export const DEFAULT_HTTP_PATH = '/rpc/';

// Penalty constants
export const INVALID_PEER_LIST_PENALTY = 100;
export const INVALID_PEER_INFO_PENALTY = 100;

// Peer inbound constants
export const DEFAULT_PING_INTERVAL_MAX = 60000;
export const DEFAULT_PING_INTERVAL_MIN = 20000;

// Peer directory constants
export const DEFAULT_NEW_BUCKET_COUNT = 128;
export const DEFAULT_NEW_BUCKET_SIZE = 32;
export const DEFAULT_EVICTION_THRESHOLD_TIME = 86400000; // Milliseconds in a day -> hours*minutes*seconds*milliseconds
export const DEFAULT_TRIED_BUCKET_COUNT = 64;
export const DEFAULT_TRIED_BUCKET_SIZE = 32;
export const DEFAULT_MAX_RECONNECT_TRIES = 3;

// Disconnect statuses
export const INTENTIONAL_DISCONNECT_CODE = 1000;
export const SEED_PEER_DISCONNECTION_REASON = 'Disconnect from SeedPeer after discovery';
export const INVALID_CONNECTION_URL_CODE = 4501;
export const INVALID_CONNECTION_URL_REASON =
	'Peer did not provide a valid URL as part of the WebSocket connection';
export const INVALID_CONNECTION_QUERY_CODE = 4502;
export const INVALID_CONNECTION_QUERY_REASON =
	'Peer did not provide valid query parameters as part of the WebSocket connection';
export const INVALID_CONNECTION_SELF_CODE = 4101;
export const INVALID_CONNECTION_SELF_REASON = 'Peer cannot connect to itself';
export const INCOMPATIBLE_NETWORK_CODE = 4102;
export const INCOMPATIBLE_NETWORK_REASON = 'Peer chainID did not match our own';
export const INCOMPATIBLE_PROTOCOL_VERSION_CODE = 4103;
export const INCOMPATIBLE_PROTOCOL_VERSION_REASON = 'Peer has incompatible protocol version';
export const INCOMPATIBLE_PEER_CODE = 4104;
export const INCOMPATIBLE_PEER_UNKNOWN_REASON =
	'Peer is incompatible with the node for unknown reasons';
export const INCOMPATIBLE_PEER_INFO_CODE = 4105;
export const INCOMPATIBLE_PEER_INFO_CODE_REASON = 'Peer has invalid PeerInfo';
// First case to follow HTTP status codes
export const FORBIDDEN_CONNECTION = 4403;
export const FORBIDDEN_CONNECTION_REASON = 'Peer is not allowed to connect';
export const EVICTED_PEER_CODE = 4418;
export const DUPLICATE_CONNECTION = 4404;
export const DUPLICATE_CONNECTION_REASON = 'Peer has a duplicate connection';
export const INVALID_CONNECTION_ADDRESS_CODE = 4503;
export const INVALID_CONNECTION_ADDRESS_REASON =
	'Peer did not provide a valid address as part of the WebSocket connection';

// Peer info constants
export const INVALID_PEER_INFO_LIST_REASON = 'PeerInfo list has invalid value';
export const PEER_INFO_LIST_TOO_LONG_REASON = 'PeerInfo list is too long';
export enum ConnectionKind {
	OUTBOUND = 'outbound',
	INBOUND = 'inbound',
	NONE = 'none',
}

export enum PeerKind {
	FIXED_PEER = 'fixedPeer',
	WHITELISTED_PEER = 'whitelistedPeer',
	SEED_PEER = 'seedPeer',
	BLACKLISTED_PEER = 'blacklistedPeer',
	NONE = 'NONE',
}
