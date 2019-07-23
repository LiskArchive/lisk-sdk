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

const setupProcessHandlers = channel => {
	process.once('SIGTERM', () => channel.cleanup(1));
	process.once('SIGINT', () => channel.cleanup(1));
	process.once('cleanup', (error, code) => channel.cleanup(code, error));
	process.once('exit', (error, code) => channel.cleanup(code, error));
};

module.exports = {
	setupProcessHandlers,
};
