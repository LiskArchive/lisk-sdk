/*
 * Copyright © 2023 Lisk Foundation
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

import { Chain, StateStore } from '@liskhq/lisk-chain';
import { dataStructures } from '@liskhq/lisk-utils';
import { address as addressUtil } from '@liskhq/lisk-cryptography';
import { Database } from '@liskhq/lisk-db';
import { BFTModule } from '../bft';
import { Consensus, Keypair } from './types';
import { Logger } from '../../logger';
import { defaultMetrics } from '../metrics/metrics';

export class SingleCommitHandler {
	private readonly _logger: Logger;
	private readonly _bft: BFTModule;
	private readonly _chain: Chain;
	private readonly _consensus: Consensus;
	private readonly _keypairs: dataStructures.BufferMap<Keypair>;
	private readonly _blockchainDB: Database;

	private readonly _metrics = {
		signedCommits: defaultMetrics.counter('generator_signedCommits'),
	};

	public constructor(
		logger: Logger,
		chain: Chain,
		consensus: Consensus,
		bft: BFTModule,
		keypairs: dataStructures.BufferMap<Keypair>,
		blockchainDB: Database,
	) {
		this._logger = logger;
		this._chain = chain;
		this._consensus = consensus;
		this._bft = bft;
		this._keypairs = keypairs;
		this._blockchainDB = blockchainDB;
	}

	// On node start, it re generates certificate from maxRemovalHeight to maxHeightPrecommitted.
	// in the _handleFinalizedHeightChanged, it loops between maxRemovalHeight + 1 and  maxHeightPrecommitted.
	// @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#initial-single-commit-creation
	public async initAllSingleCommits() {
		for (const [address] of this._keypairs.entries()) {
			await this.initSingleCommits(address);
		}
	}

	public async initSingleCommits(address: Buffer) {
		const maxRemovalHeight = await this._consensus.getMaxRemovalHeight();
		const stateStore = new StateStore(this._blockchainDB);
		const { maxHeightPrecommitted } = await this._bft.method.getBFTHeights(stateStore);
		await Promise.all(
			this._handleFinalizedHeightChanged(address, maxRemovalHeight, maxHeightPrecommitted),
		);
	}

	public async handleFinalizedHeightChanged(from: number, to: number): Promise<void> {
		const maxRemovalHeight = await this._consensus.getMaxRemovalHeight();
		const cappedFrom = Math.max(maxRemovalHeight, from);
		if (cappedFrom >= to) {
			return;
		}
		for (const [address] of this._keypairs.entries()) {
			await Promise.all(this._handleFinalizedHeightChanged(address, cappedFrom, to));
		}
	}

	private _handleFinalizedHeightChanged(
		address: Buffer,
		from: number,
		to: number,
	): Promise<void>[] {
		if (from >= to) {
			return [];
		}
		const promises = [];
		const stateStore = new StateStore(this._blockchainDB);
		const pairs = this._keypairs.get(address);
		if (!pairs) {
			this._logger.warn(
				{ address: addressUtil.getLisk32AddressFromAddress(address) },
				'Validator does not have registered BLS key on this node',
			);
			return [];
		}
		for (let height = from + 1; height < to; height += 1) {
			promises.push(
				this._certifySingleCommitForChangedHeight(
					stateStore,
					height,
					address,
					pairs.blsPublicKey,
					pairs.blsSecretKey,
				),
			);
		}
		promises.push(
			this._certifySingleCommit(stateStore, to, address, pairs.blsPublicKey, pairs.blsSecretKey),
		);
		return promises;
	}

	private async _certifySingleCommitForChangedHeight(
		stateStore: StateStore,
		height: number,
		generatorAddress: Buffer,
		blsPK: Buffer,
		blsSK: Buffer,
	): Promise<void> {
		const paramExist = await this._bft.method.existBFTParameters(stateStore, height + 1);
		if (!paramExist) {
			return;
		}
		await this._certifySingleCommit(stateStore, height, generatorAddress, blsPK, blsSK);
	}

	private async _certifySingleCommit(
		stateStore: StateStore,
		height: number,
		generatorAddress: Buffer,
		blsPK: Buffer,
		blsSK: Buffer,
	): Promise<void> {
		const params = await this._bft.method.getBFTParametersActiveValidators(stateStore, height);
		const registeredValidator = params.validators.find(v => v.address.equals(generatorAddress));
		if (!registeredValidator) {
			return;
		}
		if (!registeredValidator.blsKey.equals(blsPK)) {
			this._logger.warn(
				{ address: addressUtil.getLisk32AddressFromAddress(generatorAddress) },
				'Validator does not have registered BLS key',
			);
			return;
		}

		const blockHeader = await this._chain.dataAccess.getBlockHeaderByHeight(height);
		const validatorInfo = {
			address: generatorAddress,
			blsPublicKey: blsPK,
			blsSecretKey: blsSK,
		};
		this._consensus.certifySingleCommit(blockHeader, validatorInfo);
		this._logger.debug(
			{
				height,
				generator: addressUtil.getLisk32AddressFromAddress(generatorAddress),
			},
			'Certified single commit',
		);
		this._metrics.signedCommits.inc(1);
	}
}
