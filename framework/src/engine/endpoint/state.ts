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
import { ABI, ProveResponseJSON } from '../../abi';
import { RequestContext } from '../rpc/rpc_server';

interface EndpointArgs {
	abi: ABI;
	chain: Chain;
}

interface StateProveRequest {
	queryKeys: string[];
}

const stateProveRequestSchema = {
	$id: '/node/endpoint/stateProveRequestSchema',
	type: 'object',
	required: ['queryKeys'],
	properties: {
		queryKeys: {
			type: 'array',
			items: {
				dataType: 'string',
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

	public async prove(ctx: RequestContext): Promise<ProveResponseJSON> {
		validator.validate<StateProveRequest>(stateProveRequestSchema, ctx.params);
		if (!this._chain.lastBlock.header.stateRoot) {
			throw new Error('Last block header state root is empty.');
		}
		const { proof } = await this._abi.prove({
			stateRoot: this._chain.lastBlock.header.stateRoot,
			keys: ctx.params.queryKeys.map(key => Buffer.from(key, 'hex')),
		});

		return {
			proof: {
				queries: proof.queries.map(query => ({
					bitmap: query.bitmap.toString('hex'),
					key: query.key.toString('hex'),
					value: query.value.toString('hex'),
				})),
				siblingHashes: proof.siblingHashes.map(s => s.toString('hex')),
			},
		};
	}
}
