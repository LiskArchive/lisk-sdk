/*
 * Copyright © 2022 Lisk Foundation
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

import { codec, Schema } from '@liskhq/lisk-codec';
import { Router } from 'zeromq';
import {
	ABI,
	IPCRequest,
	ipcRequestSchema,
	ipcResponseSchema,
	readyRequestSchema,
	readyResponseSchema,
	afterTransactionsExecuteRequestSchema,
	afterTransactionsExecuteResponseSchema,
	beforeTransactionsExecuteRequestSchema,
	beforeTransactionsExecuteResponseSchema,
	clearRequestSchema,
	clearResponseSchema,
	commitRequestSchema,
	commitResponseSchema,
	executeTransactionRequestSchema,
	executeTransactionResponseSchema,
	finalizeRequestSchema,
	finalizeResponseSchema,
	initGenesisStateRequestSchema,
	initGenesisStateResponseSchema,
	initStateMachineRequestSchema,
	initStateMachineResponseSchema,
	insertAssetsRequestSchema,
	insertAssetsResponseSchema,
	metadataRequestSchema,
	metadataResponseSchema,
	proveRequestSchema,
	proveResponseSchema,
	queryRequestSchema,
	queryResponseSchema,
	revertRequestSchema,
	revertResponseSchema,
	verifyAssetsRequestSchema,
	verifyAssetsResponseSchema,
	verifyTransactionRequestSchema,
	verifyTransactionResponseSchema,
} from '../abi';
import { Logger } from '../logger';

export class ABIServer {
	private readonly _socketPath: string;
	private readonly _router: Router;
	private readonly _logger: Logger;

	private readonly _abiHandlers: Record<
		string,
		{
			request: Schema;
			response: Schema;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			func: (req: any) => Promise<any>;
		}
	> = {};

	public constructor(logger: Logger, socketPath: string, abi: ABI) {
		this._socketPath = socketPath;
		this._logger = logger;
		this._router = new Router();
		this._abiHandlers[abi.ready.name] = {
			request: readyRequestSchema,
			response: readyResponseSchema,
			func: abi.ready.bind(abi),
		};
		this._abiHandlers[abi.initStateMachine.name] = {
			request: initStateMachineRequestSchema,
			response: initStateMachineResponseSchema,
			func: abi.initStateMachine.bind(abi),
		};
		this._abiHandlers[abi.initGenesisState.name] = {
			request: initGenesisStateRequestSchema,
			response: initGenesisStateResponseSchema,
			func: abi.initGenesisState.bind(abi),
		};
		this._abiHandlers[abi.insertAssets.name] = {
			request: insertAssetsRequestSchema,
			response: insertAssetsResponseSchema,
			func: abi.insertAssets.bind(abi),
		};
		this._abiHandlers[abi.verifyAssets.name] = {
			request: verifyAssetsRequestSchema,
			response: verifyAssetsResponseSchema,
			func: abi.verifyAssets.bind(abi),
		};
		this._abiHandlers[abi.beforeTransactionsExecute.name] = {
			request: beforeTransactionsExecuteRequestSchema,
			response: beforeTransactionsExecuteResponseSchema,
			func: abi.beforeTransactionsExecute.bind(abi),
		};
		this._abiHandlers[abi.afterTransactionsExecute.name] = {
			request: afterTransactionsExecuteRequestSchema,
			response: afterTransactionsExecuteResponseSchema,
			func: abi.afterTransactionsExecute.bind(abi),
		};
		this._abiHandlers[abi.verifyTransaction.name] = {
			request: verifyTransactionRequestSchema,
			response: verifyTransactionResponseSchema,
			func: abi.verifyTransaction.bind(abi),
		};
		this._abiHandlers[abi.executeTransaction.name] = {
			request: executeTransactionRequestSchema,
			response: executeTransactionResponseSchema,
			func: abi.executeTransaction.bind(abi),
		};
		this._abiHandlers[abi.commit.name] = {
			request: commitRequestSchema,
			response: commitResponseSchema,
			func: abi.commit.bind(abi),
		};
		this._abiHandlers[abi.revert.name] = {
			request: revertRequestSchema,
			response: revertResponseSchema,
			func: abi.revert.bind(abi),
		};
		this._abiHandlers[abi.clear.name] = {
			request: clearRequestSchema,
			response: clearResponseSchema,
			func: abi.clear.bind(abi),
		};
		this._abiHandlers[abi.finalize.name] = {
			request: finalizeRequestSchema,
			response: finalizeResponseSchema,
			func: abi.finalize.bind(abi),
		};
		this._abiHandlers[abi.getMetadata.name] = {
			request: metadataRequestSchema,
			response: metadataResponseSchema,
			func: abi.getMetadata.bind(abi),
		};
		this._abiHandlers[abi.query.name] = {
			request: queryRequestSchema,
			response: queryResponseSchema,
			func: abi.query.bind(abi),
		};
		this._abiHandlers[abi.prove.name] = {
			request: proveRequestSchema,
			response: proveResponseSchema,
			func: abi.prove.bind(abi),
		};
	}

	public async start(): Promise<void> {
		await this._router.bind(this._socketPath);
		this._listenToRequest().catch(err => {
			this._logger.error({ err: err as Error }, 'Fail to listen to ABI request');
		});
	}

	public stop(): void {
		this._router.close();
	}

	private async _listenToRequest() {
		for await (const [sender, message] of this._router) {
			let request: IPCRequest;
			try {
				request = codec.decode<IPCRequest>(ipcRequestSchema, message);
			} catch (error) {
				await this._replyError(sender, 'Failed to decode message');
				this._logger.debug({ err: error as Error }, 'Failed to decode ABI request');
				continue;
			}
			this._logger.info(request, 'ABI request received');
			const handler = this._abiHandlers[request.method];
			if (!handler) {
				await this._replyError(sender, `Method ${request.method} is not registered.`, request.id);
				continue;
			}
			try {
				// eslint-disable-next-line @typescript-eslint/ban-types
				const params =
					Object.keys(handler.request.properties).length > 0
						? codec.decode<object>(handler.request, request.params)
						: {};
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const resp = await handler.func(params);
				await this._router.send([
					sender,
					codec.encode(ipcResponseSchema, {
						id: request.id,
						success: true,
						error: {
							message: '',
						},
						result:
							Object.keys(handler.response.properties).length > 0
								? codec.encode(handler.response, resp)
								: Buffer.alloc(0),
					}),
				]);
				this._logger.info(request, 'responded from abi server');
			} catch (error) {
				this._logger.error({ err: error as Error, method: request.method }, 'Fail to respond');
				await this._replyError(sender, (error as Error).message, request.id);
				continue;
			}
		}
	}

	private async _replyError(sender: Buffer, msg: string, id?: bigint): Promise<void> {
		await this._router
			.send([
				sender,
				codec.encode(ipcResponseSchema, {
					id: id ?? BigInt(0),
					success: false,
					error: {
						message: msg,
					},
					result: Buffer.alloc(0),
				}),
			])
			.catch(sendErr => {
				this._logger.error({ err: sendErr as Error }, 'Failed to send response to the ABI request');
			});
	}
}
