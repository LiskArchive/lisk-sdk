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
import { validator } from '@liskhq/lisk-validator';
import { ABI, ProveResponse } from '../../abi';
import { RequestContext } from '../rpc/rpc_server';

interface EndpointArgs {
	abi: ABI;
	chain: Chain;
}

interface StateProveRequest {
	keys: Buffer[];
}

const stateProveRequestSchema = {
	$id: '/node/endpoint/stateProveRequestSchema',
	type: 'object',
	required: ['keys'],
	properties: {
		keys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export class StateEndpoint {
	[key: string]: unknown;
	private readonly _abi: ABI;
	private readonly _chain: Chain;

	public constructor(args: EndpointArgs) {
		this._abi = args.abi;
		this._chain = args.chain;
	}

	public async stateProve(ctx: RequestContext): Promise<ProveResponse> {
		validator.validate<StateProveRequest>(stateProveRequestSchema, ctx.params);
		if (!this._chain.lastBlock.header.stateRoot) {
			throw new Error('Last block header state root is empty.');
		}
		return this._abi.prove({
			stateRoot: this._chain.lastBlock.header.stateRoot,
			keys: ctx.params.keys,
		});
	}
}
