/*
 * Copyright © 2020 Lisk Foundation
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
import { Block } from '@liskhq/lisk-chain';

export const getTotalFees = (
	block: Block,
	minimumFee: bigint,
	baseFees: ReadonlyArray<{ assetType: number; baseFee: string; moduleType: number }>,
): { readonly totalFee: bigint; readonly totalMinFee: bigint } =>
	block.payload.reduce(
		(prev, current) => {
			const baseFee =
				baseFees.find(
					(fee: { moduleType: number; assetType: number }) =>
						fee.moduleType === current.moduleType && fee.assetType === current.assetType,
				)?.baseFee ?? BigInt(0);

			const minFee = minimumFee * BigInt(current.getBytes().length) + BigInt(baseFee);

			return {
				totalFee: prev.totalFee + current.fee,
				totalMinFee: prev.totalMinFee + minFee,
			};
		},
		{ totalFee: BigInt(0), totalMinFee: BigInt(0) },
	);
