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

// P2P general events
export const EVENT_NEW_INBOUND_PEER = 'newInboundPeer';
export const EVENT_FAILED_TO_ADD_INBOUND_PEER = 'failedToAddInboundPeer';
export const EVENT_NETWORK_READY = 'networkReady';

// P2P pool event
export const EVENT_REMOVE_PEER = 'removePeer';

// Peer Local emitted events.
export const EVENT_REQUEST_RECEIVED = 'requestReceived';
export const EVENT_INVALID_REQUEST_RECEIVED = 'invalidRequestReceived';
export const EVENT_MESSAGE_RECEIVED = 'messageReceived';
export const EVENT_INVALID_MESSAGE_RECEIVED = 'invalidMessageReceived';
export const EVENT_BAN_PEER = 'banPeer';
export const EVENT_UNBAN_PEER = 'unbanPeer';
export const EVENT_DISCOVERED_PEER = 'discoveredPeer';
export const EVENT_UPDATED_PEER_INFO = 'updatedPeerInfo';
export const EVENT_FAILED_PEER_INFO_UPDATE = 'failedPeerInfoUpdate';
export const EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT =
	'failedToCollectPeerDetailsOnConnect';
export const EVENT_FAILED_TO_FETCH_PEERS = 'failedToFetchPeers';
export const EVENT_FAILED_TO_FETCH_PEER_INFO = 'failedToFetchPeerInfo';
export const EVENT_FAILED_TO_PUSH_NODE_INFO = 'failedToPushNodeInfo';

// Peer remote event or RPC names sent to or received from peers.
export const REMOTE_EVENT_RPC_REQUEST = 'rpc-request';
export const REMOTE_EVENT_MESSAGE = 'remote-message';

export const REMOTE_RPC_UPDATE_PEER_INFO = 'updateMyself';
export const REMOTE_RPC_GET_NODE_INFO = 'status';
export const REMOTE_RPC_GET_PEERS_LIST = 'list';

// Inbound peer events
export const EVENT_CLOSE_INBOUND = 'closeInbound';
export const EVENT_INBOUND_SOCKET_ERROR = 'inboundSocketError';
export const EVENT_PING = 'ping';

// Outbound peer events
export const EVENT_CONNECT_OUTBOUND = 'connectOutbound';
export const EVENT_CONNECT_ABORT_OUTBOUND = 'connectAbortOutbound';
export const EVENT_CLOSE_OUTBOUND = 'closeOutbound';
export const EVENT_OUTBOUND_SOCKET_ERROR = 'outboundSocketError';
export const RESPONSE_PONG = 'pong';
