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

import { StateStore } from '@liskhq/lisk-chain';
import { Database } from '@liskhq/lisk-db';
import { BFTAPI } from '../bft';
import { BFTHeights } from '../bft/types';
import { RequestContext } from '../rpc/rpc_server';

interface EndpointArgs {
	bftAPI: BFTAPI;
	blockchainDB: Database;
}

export interface BFTValidatorJSON {
	address: string;
	bftWeight: string;
	blsKey: string;
}

interface BFTParametersJSON {
	prevoteThreshold: string;
	precommitThreshold: string;
	certificateThreshold: string;
	validators: BFTValidatorJSON[];
	validatorsHash: string;
}

export class ConsensusEndpoint {
	[key: string]: unknown;
	private readonly _bftAPI: BFTAPI;
	private readonly _blockchainDB: Database;

	public constructor(args: EndpointArgs) {
		this._bftAPI = args.bftAPI;
		this._blockchainDB = args.blockchainDB;
	}

	public async getBFTParameters(ctx: RequestContext): Promise<BFTParametersJSON> {
		const stateStore = new StateStore(this._blockchainDB);
		const {
			certificateThreshold,
			precommitThreshold,
			prevoteThreshold,
			validators,
			validatorsHash,
		} = await this._bftAPI.getBFTParameters(stateStore, ctx.params.height as number);

		const validatorsJSON = validators.map(v => ({
			address: v.address.toString('hex'),
			bftWeight: v.bftWeight.toString(),
			blsKey: v.blsKey.toString('hex'),
		}));

		return {
			validators: validatorsJSON,
			certificateThreshold: certificateThreshold.toString(),
			precommitThreshold: precommitThreshold.toString(),
			prevoteThreshold: prevoteThreshold.toString(),
			validatorsHash: validatorsHash.toString('hex'),
		};
	}

	public async getBFTHeights(_ctx: RequestContext): Promise<BFTHeights> {
		const stateStore = new StateStore(this._blockchainDB);
		const result = await this._bftAPI.getBFTHeights(stateStore);

		return result;
	}
}
