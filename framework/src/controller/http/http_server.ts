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
	private readonly port: number;
	private readonly host?: string;
	private readonly logger: Logger;

	public constructor(options: { port: number; host?: string; logger: Logger }) {
		this.host = options.host;
		this.port = options.port;
		this.logger = options.logger;
	}

	public start(httpRequestListener: HTTPRequestListener): HTTP.Server {
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

		this.server.listen(this.port, this.host, () => {
			this.logger.info(`HTTP Server is listening at port ${this.port}`);
		});

		this.server.on('error', error => {
			this.logger.error(error);
		});

		return this.server;
	}

	public stop(): void {
		if (this.server) {
			this.server.close();
		}
	}
}
