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

const utils = require('../utils');

function setMonitoringSocketsConnections(params, configurations) {
	// eslint-disable-next-line mocha/no-top-level-hooks
	before(done => {
		utils.ws.establishWSConnectionsToNodes(
			configurations,
			(err, socketsResult) => {
				if (err) {
					return done(err);
				}
				params.sockets = socketsResult;
				params.configurations = configurations;
				done();
			}
		);
	});

	// eslint-disable-next-line mocha/no-top-level-hooks
	after(done => {
		utils.ws.killMonitoringSockets(params.sockets, done);
	});
}

module.exports = {
	setMonitoringSocketsConnections,
};
