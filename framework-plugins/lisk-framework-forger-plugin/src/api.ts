/*
 * Copyright © 2020 Lisk Foundation
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

import * as express from 'express';
import { Express } from 'express';
import { BaseChannel, PluginCodec } from 'lisk-framework';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import * as middlewares from './middlewares';
import * as controllers from './controllers';
import { Options } from './types';

export const initApi = (options: Options, channel: BaseChannel, _codec: PluginCodec): Express => {
	const app: Express = express();

	// Register before middleware
	app.use(cors(options.cors));
	app.use(express.json());
	app.use(rateLimit(options.limits));
	app.use(middlewares.whiteListMiddleware(options));

	// Register controllers
	app.get('/v1/hello', controllers.helloController(channel));
	// Register after middleware
	app.use(middlewares.errorMiddleware());

	return app;
};
