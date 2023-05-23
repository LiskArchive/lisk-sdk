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

const ALLOWED_METHOD = 'POST';
export class HTTPServer {
	public server!: HTTP.Server;
	private readonly _port: number;
	private readonly _host?: string;
	private readonly _path: string;
	private readonly _ignorePaths: string[];
	private readonly _accessControlAllowOrigin: string;
	private _logger!: Logger;

	public constructor(options: {
		port: number;
		host?: string;
		path?: string;
		ignorePaths?: string[];
		accessControlAllowOrigin: string;
	}) {
		this._host = options.host;
		this._port = options.port;
		this._path = options.path ?? '/rpc';
		this._ignorePaths = options.ignorePaths ?? [];
		this._accessControlAllowOrigin = options.accessControlAllowOrigin ?? '*';
	}

	public start(logger: Logger, httpRequestListener: HTTPRequestListener): HTTP.Server {
		this._logger = logger;
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.server = HTTP.createServer(async (req, res) => {
			if (this._ignorePaths.some(v => v === req.url)) {
				return undefined;
			}
			const headers = {
				'Access-Control-Allow-Origin': this._accessControlAllowOrigin,
				'Access-Control-Allow-Methods': ALLOWED_METHOD,
				'Content-Type': 'application/json',
			};
			if (req.url !== this._path) {
				res.writeHead(404, headers);
				return res.end(`${req.url ?? ''} not found.`);
			}

			if ((req.method as string) === ALLOWED_METHOD) {
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

		this.server.on('error', err => {
			this._logger.error({ err }, 'Error on HTTP server');
		});

		return this.server;
	}

	public stop(): void {
		if (this.server) {
			this.server.close();
		}
	}

	public listen(): void {
		this.server.listen(this._port, this._host, () => {
			this._logger.info(
				`RPC HTTP Server starting at ${this._host ?? ''}:${this._port}${this._path}`,
			);
		});
	}
}
