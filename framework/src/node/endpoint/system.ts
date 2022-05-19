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
import { Chain } from '@liskhq/lisk-chain';
import { BaseModule } from '../../modules';
import { ModuleMetadata } from '../../modules/base_module';
import { Consensus } from '../consensus';
import { Generator } from '../generator';
import { RequestContext } from '../rpc/rpc_server';
import { NodeOptions } from '../types';

interface EndpointArgs {
	chain: Chain;
	consensus: Consensus;
	generator: Generator;
	registeredModules: BaseModule[];
	options: NodeOptions;
}

type ModuleMetadataWithRoot = { id: number; name: string } & ModuleMetadata;
export class SystemEndpoint {
	[key: string]: unknown;
	private readonly _chain: Chain;
	private readonly _consensus: Consensus;
	private readonly _generator: Generator;
	private readonly _options: NodeOptions;
	private readonly _registeredModules: BaseModule[];

	public constructor(args: EndpointArgs) {
		this._chain = args.chain;
		this._consensus = args.consensus;
		this._generator = args.generator;
		this._options = args.options;
		this._registeredModules = args.registeredModules;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getNodeInfo(_context: RequestContext) {
		return {
			version: this._options.version,
			networkVersion: this._options.networkVersion,
			networkIdentifier: this._chain.networkIdentifier.toString('hex'),
			lastBlockID: this._chain.lastBlock.header.id.toString('hex'),
			height: this._chain.lastBlock.header.height,
			finalizedHeight: this._consensus.finalizedHeight(),
			syncing: this._consensus.syncing(),
			unconfirmedTransactions: this._generator.getPooledTransactions().length,
			genesis: {
				...this._options.genesis,
			},
			network: {
				port: this._options.network.port,
				hostIp: this._options.network.hostIp,
				seedPeers: this._options.network.seedPeers,
				blacklistedIPs: this._options.network.blacklistedIPs,
				fixedPeers: this._options.network.fixedPeers,
				whitelistedPeers: this._options.network.whitelistedPeers,
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getMetadata(_ctx: RequestContext): Promise<{ modules: ModuleMetadataWithRoot[] }> {
		const modules = this._registeredModules.map(mod => {
			const meta = mod.metadata();
			return {
				id: mod.id,
				name: mod.name,
				...meta,
			};
		});
		modules.sort((a, b) => a.id - b.id);
		return {
			modules,
		};
	}
}
