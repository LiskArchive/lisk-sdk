/*
 * Copyright © 2021 Lisk Foundation
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
import * as HTTP from 'http';
import { Logger } from '../../logger';

export type HTTPRequestListener = (
	req: HTTP.IncomingMessage,
	res: HTTP.ServerResponse,
	message: string,
) => void;

const ALLOWED_METHODS = ['GET', 'POST'];
export class HTTPServer {
	public server!: HTTP.Server;
	private readonly _port: number;
	private readonly _host?: string;
	private _logger!: Logger;

	public constructor(options: { port: number; host?: string }) {
		this._host = options.host;
		this._port = options.port;
	}

	public start(logger: Logger, httpRequestListener: HTTPRequestListener): HTTP.Server {
		this._logger = logger;
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.server = HTTP.createServer(async (req, res) => {
			const headers = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': ALLOWED_METHODS.join(','),
				'Content-Type': 'application/json',
			};

			if (ALLOWED_METHODS.includes(req.method as string)) {
				res.writeHead(200, headers);

				const buffers = [];
				for await (const chunks of req) {
					buffers.push(chunks);
				}
				const message = Buffer.concat(buffers).toString();
				return httpRequestListener(req, res, message);
			}

			res.writeHead(405, headers);
			return res.end(`${req.method as string} is not allowed for the request.`);
		});

		this.server.listen(this._port, this._host, () => {
			this._logger.info(`RPC HTTP Server is listening at port ${this._port}`);
		});

		this.server.on('error', this._logger.error);

		return this.server;
	}

	public stop(): void {
		if (this.server) {
			this.server.close();
		}
	}
}
