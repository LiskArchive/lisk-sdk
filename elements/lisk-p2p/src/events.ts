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
// P2P general
export const EVENT_NEW_INBOUND_PEER = 'EVENT_NEW_INBOUND_PEER';
export const EVENT_NEW_INBOUND_PEER_CONNECTION = 'EVENT_NEW_INBOUND_PEER_CONNECTION';
export const EVENT_FAILED_TO_ADD_INBOUND_PEER = 'EVENT_FAILED_TO_ADD_INBOUND_PEER';
export const EVENT_NETWORK_READY = 'EVENT_NETWORK_READY';

// P2P pool
export const EVENT_REMOVE_PEER = 'EVENT_REMOVE_PEER';

// Peer Local emitted events
export const EVENT_REQUEST_RECEIVED = 'EVENT_REQUEST_RECEIVED';
export const EVENT_INVALID_REQUEST_RECEIVED = 'EVENT_INVALID_REQUEST_RECEIVED';
export const EVENT_MESSAGE_RECEIVED = 'EVENT_MESSAGE_RECEIVED';
export const EVENT_INVALID_MESSAGE_RECEIVED = 'EVENT_INVALID_MESSAGE_RECEIVED';
export const EVENT_BAN_PEER = 'EVENT_BAN_PEER';
export const EVENT_DISCOVERED_PEER = 'EVENT_DISCOVERED_PEER';
export const EVENT_UPDATED_PEER_INFO = 'EVENT_UPDATED_PEER_INFO';
export const EVENT_FAILED_PEER_INFO_UPDATE = 'EVENT_FAILED_PEER_INFO_UPDATE';
export const EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT =
	'EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT';
export const EVENT_FAILED_TO_FETCH_PEERS = 'EVENT_FAILED_TO_FETCH_PEERS';
export const EVENT_FAILED_TO_FETCH_PEER_INFO = 'EVENT_FAILED_TO_FETCH_PEER_INFO';
export const EVENT_FAILED_TO_PUSH_NODE_INFO = 'EVENT_FAILED_TO_PUSH_NODE_INFO';
export const EVENT_FAILED_TO_SEND_MESSAGE = 'EVENT_FAILED_TO_SEND_MESSAGE';

// Peer base
export const REMOTE_SC_EVENT_RPC_REQUEST = 'rpc-request';
export const REMOTE_SC_EVENT_MESSAGE = 'remote-message';

// P2P Protocol messages
export const REMOTE_EVENT_POST_NODE_INFO = 'postNodeInfo';
export const REMOTE_EVENT_RPC_GET_NODE_INFO = 'getNodeInfo';
export const REMOTE_EVENT_RPC_GET_PEERS_LIST = 'getPeers';
export const REMOTE_EVENT_PING = 'ping';
export const REMOTE_EVENT_PONG = 'pong';

// P2P Protocol messages list
export const PROTOCOL_EVENTS_TO_RATE_LIMIT: Set<string> = new Set([
	REMOTE_EVENT_RPC_GET_NODE_INFO,
	REMOTE_EVENT_RPC_GET_PEERS_LIST,
]);

// Inbound peer
export const EVENT_CLOSE_INBOUND = 'EVENT_CLOSE_INBOUND';
export const EVENT_INBOUND_SOCKET_ERROR = 'EVENT_INBOUND_SOCKET_ERROR';

// Outbound peer
export const EVENT_CONNECT_OUTBOUND = 'EVENT_CONNECT_OUTBOUND';
export const EVENT_CONNECT_ABORT_OUTBOUND = 'EVENT_CONNECT_ABORT_OUTBOUND';
export const EVENT_CLOSE_OUTBOUND = 'EVENT_CLOSE_OUTBOUND';
export const EVENT_OUTBOUND_SOCKET_ERROR = 'EVENT_OUTBOUND_SOCKET_ERROR';
