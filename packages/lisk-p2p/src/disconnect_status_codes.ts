export const INVALID_CONNECTION_URL_CODE = 4501;
export const INVALID_CONNECTION_URL_REASON =
	'Peer did not provide a valid URL as part of the WebSocket connection';

export const INVALID_CONNECTION_QUERY_CODE = 4502;
export const INVALID_CONNECTION_QUERY_REASON =
	'Peer did not provide valid query parameters as part of the WebSocket connection';

export const INCOMPATIBLE_NETWORK_CODE = 4102;
export const INCOMPATIBLE_NETWORK_REASON = 'Peer nethash did not match our own';

export const INCOMPATIBLE_VERSION_CODE = 4103;
export const INCOMPATIBLE_VERSION_REASON =
	'Peer has incompatible or lower than the minimum version required';

export const INCOMPATIBLE_PROTOCOL_VERSION_CODE = 4104;
export const INCOMPATIBLE_PROTOCOL_VERSION_REASON =
	'Peer has incompatible protocol version';
