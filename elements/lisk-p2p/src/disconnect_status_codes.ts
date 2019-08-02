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

export const INVALID_CONNECTION_URL_CODE = 4501;
export const INVALID_CONNECTION_URL_REASON =
	'Peer did not provide a valid URL as part of the WebSocket connection';

export const INVALID_CONNECTION_QUERY_CODE = 4502;
export const INVALID_CONNECTION_QUERY_REASON =
	'Peer did not provide valid query parameters as part of the WebSocket connection';

export const INVALID_CONNECTION_SELF_CODE = 4101;
export const INVALID_CONNECTION_SELF_REASON = 'Peer cannot connect to itself';

export const INCOMPATIBLE_NETWORK_CODE = 4102;
export const INCOMPATIBLE_NETWORK_REASON = 'Peer nethash did not match our own';

export const INCOMPATIBLE_PROTOCOL_VERSION_CODE = 4103;
export const INCOMPATIBLE_PROTOCOL_VERSION_REASON =
	'Peer has incompatible protocol version';

export const INCOMPATIBLE_PEER_CODE = 4104;
export const INCOMPATIBLE_PEER_UNKNOWN_REASON =
	'Peer is incompatible with the node for unknown reasons';

// First case to follow HTTP status codes
export const FORBIDDEN_CONNECTION = 4403;
export const FORBIDDEN_CONNECTION_REASON = 'Peer is not allowed to connect';
