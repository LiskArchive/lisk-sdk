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

let wsServer = null;

/**
 * Description of the module.
 *
 * @module
 * @see Parent: {@link api.ws.rpc}
 * @requires lodash
 * @requires socketcluster-client
 * @requires wamp-socket-cluster/WAMPClient
 * @requires wamp-socket-cluster/MasterWAMPServe
 * @requires api/ws/rpc/failureCodes
 * @requires helpers/promiseDefer
 * @requires modules/system
 * @todo Add description for the module
 */

/**
 * @alias module:api/ws/rpc/wsRPC
 */
const wsRPC = {
	/**
	 * Description of the function.
	 *
	 * @param {Object} __wsServer
	 * @todo Add description for the function and the params
	 */
	setServer(__wsServer) {
		wsServer = __wsServer;
	},

	/**
	 * Description of the function.
	 *
	 * @throws {Error} If WS server has not been initialized yet
	 * @returns {MasterWAMPServer} wsServer
	 * @todo Add description for the function
	 */
	getServer() {
		if (!wsServer) {
			throw new Error('WS server has not been initialized!');
		}
		return wsServer;
	},

	/**
	 * Description of the function.
	 *
	 * @throws {Error} If WS server has not been initialized yet
	 * @returns {Object} wsServer
	 * @todo Add description for the function
	 */
	getServerAuthKey() {
		if (!wsServer) {
			throw new Error('WS server has not been initialized!');
		}
		return wsServer.socketCluster.options.authKey;
	},
};

const remoteAction = function(query, cb) {
	const err = 'Function invoked on master instead of slave process';
	return setImmediate(cb, err);
};

const slaveRPCStub = {
	updateMyself: remoteAction,
};

module.exports = {
	wsRPC,
	slaveRPCStub,
};
