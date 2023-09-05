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
import { address } from '@liskhq/lisk-cryptography';
import { Database } from '@liskhq/lisk-db';
import { BFTMethod } from '../bft';
import { BFTHeights } from '../bft/types';
import { RequestContext } from '../rpc/rpc_server';

interface EndpointArgs {
	bftMethod: BFTMethod;
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
	private readonly _bftMethod: BFTMethod;
	private readonly _blockchainDB: Database;

	public constructor(args: EndpointArgs) {
		this._bftMethod = args.bftMethod;
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
		} = await this._bftMethod.getBFTParameters(stateStore, ctx.params.height as number);

		const validatorsJSON = validators.map(v => ({
			address: address.getLisk32AddressFromAddress(v.address),
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

	public async getBFTParametersActiveValidators(ctx: RequestContext): Promise<BFTParametersJSON> {
		const stateStore = new StateStore(this._blockchainDB);
		const {
			certificateThreshold,
			precommitThreshold,
			prevoteThreshold,
			validators,
			validatorsHash,
		} = await this._bftMethod.getBFTParametersActiveValidators(
			stateStore,
			ctx.params.height as number,
		);

		const validatorsJSON = validators.map(v => ({
			address: address.getLisk32AddressFromAddress(v.address),
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
		const result = await this._bftMethod.getBFTHeights(stateStore);

		return result;
	}
}
