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
import {
	blockAssetSchema,
	blockHeaderSchema,
	blockSchema,
	Chain,
	eventSchema,
	standardEventDataSchema,
	transactionSchema,
} from '@liskhq/lisk-chain';
import { ABI } from '../../abi';
import { EngineConfig } from '../../types';
import { Consensus } from '../consensus';
import { Generator } from '../generator';
import { RequestContext } from '../rpc/rpc_server';
import { defaultMetrics } from '../metrics/metrics';

interface EndpointArgs {
	abi: ABI;
	chain: Chain;
	consensus: Consensus;
	generator: Generator;
	config: EngineConfig;
	genesisHeight: number;
}

export class SystemEndpoint {
	[key: string]: unknown;
	private readonly _abi: ABI;
	private readonly _chain: Chain;
	private readonly _consensus: Consensus;
	private readonly _generator: Generator;
	private readonly _config: EngineConfig;
	private readonly _genesisHeight: number;

	public constructor(args: EndpointArgs) {
		this._abi = args.abi;
		this._chain = args.chain;
		this._consensus = args.consensus;
		this._generator = args.generator;
		this._config = args.config;
		this._genesisHeight = args.genesisHeight;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getNodeInfo(_context: RequestContext) {
		return {
			version: this._config.system.version,
			networkVersion: this._config.network.version,
			chainID: this._chain.chainID.toString('hex'),
			lastBlockID: this._chain.lastBlock.header.id.toString('hex'),
			height: this._chain.lastBlock.header.height,
			finalizedHeight: this._consensus.finalizedHeight(),
			syncing: this._consensus.syncing(),
			unconfirmedTransactions: this._generator.getPooledTransactions().length,
			genesisHeight: this._genesisHeight,
			genesis: {
				...this._config.genesis,
			},
			network: {
				version: this._config.network.version,
				port: this._config.network.port,
				host: this._config.network.host,
				seedPeers: this._config.network.seedPeers,
				blacklistedIPs: this._config.network.blacklistedIPs,
				fixedPeers: this._config.network.fixedPeers,
				whitelistedPeers: this._config.network.whitelistedPeers,
			},
		};
	}

	public async getMetadata(_ctx: RequestContext): Promise<Record<string, unknown>> {
		const { data } = await this._abi.getMetadata({});
		return JSON.parse(data.toString()) as Record<string, unknown>;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getSchema(_ctx: RequestContext): Promise<Record<string, unknown>> {
		return {
			block: blockSchema,
			header: blockHeaderSchema,
			asset: blockAssetSchema,
			transaction: transactionSchema,
			event: eventSchema,
			standardEvent: standardEventDataSchema,
		};
	}

	public async getMetricsReport(ctx: RequestContext): Promise<unknown> {
		if (!defaultMetrics.enabled()) {
			throw new Error('metrics is not enabled');
		}
		if (ctx.params && ctx.params.inString === true) {
			return defaultMetrics.report();
		}
		return defaultMetrics.report(true);
	}
}
