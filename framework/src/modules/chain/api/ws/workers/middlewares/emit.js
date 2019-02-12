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

const connectionsTable = require('../../workers/connections_table');

/**
 * @param {object} request
 */
function addNonceToRequest(request) {
	request.data = request.data || {};
	request.data.nonce = connectionsTable.getNonce(request.socket.id);
}

const receiveDataEvents = ['postBlock', 'postTransactions', 'postSignatures'];

/**
 * Middleware used to process every emit event received by SlaveWAMPServer in workers_controller.js
 * @param {Object} req
 * @param {function} next
 */
function emitMiddleware(req, next) {
	if (receiveDataEvents.indexOf(req.event) !== -1) {
		addNonceToRequest(req);
	}
	return next();
}

module.exports = emitMiddleware;
