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
import { ModuleEndpointContext } from '../../types';
import { Consensus } from '../consensus';
import { Generator } from '../generator';
import { NodeOptions } from '../types';

interface EndpoinArgs {
	chain: Chain;
	consensus: Consensus;
	generator: Generator;
	options: NodeOptions;
}

export class SystemEndpoint {
	[key: string]: unknown;
	private readonly _chain: Chain;
	private readonly _consensus: Consensus;
	private readonly _generator: Generator;
	private readonly _options: NodeOptions;

	public constructor(args: EndpoinArgs) {
		this._chain = args.chain;
		this._consensus = args.consensus;
		this._generator = args.generator;
		this._options = args.options;
	}

	public getNodeInfo(_context: ModuleEndpointContext) {
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
}
