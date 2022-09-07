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

import { validator } from '@liskhq/lisk-validator';
import { ABI, ProveRequest, ProveResponse } from '../../abi';
import { RequestContext } from '../rpc/rpc_server';

interface EndpointArgs {
	abi: ABI;
}

const stateProveRequestSchema = {
	$id: '/node/endpoint/stateProveRequestSchema',
	type: 'object',
	required: ['stateRoot', 'keys'],
	properties: {
		stateRoot: {
			dataType: 'bytes',
		},
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

	public constructor(args: EndpointArgs) {
		this._abi = args.abi;
	}

	public async stateProve(ctx: RequestContext): Promise<ProveResponse> {
		validator.validate<ProveRequest>(stateProveRequestSchema, ctx.params);
		return this._abi.prove({
			stateRoot: ctx.params.stateRoot,
			keys: ctx.params.keys,
		});
	}
}
