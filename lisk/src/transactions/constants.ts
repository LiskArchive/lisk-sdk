/*
 * Copyright © 2018 Lisk Foundation
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
 *
 */
/* tslint:disable:no-magic-numbers */
import { constants } from '@liskhq/lisk-transactions';

const { FIXED_POINT, MAX_TRANSACTION_AMOUNT } = constants;

export const TRANSACTION_DAPP_TYPE = 5;
export const TRANSACTION_INTRANSFER_TYPE = 6;
export const TRANSACTION_OUTTRANSFER_TYPE = 7;

export const IN_TRANSFER_FEE = FIXED_POINT * 0.1;
export const OUT_TRANSFER_FEE = FIXED_POINT * 0.1;
export const DAPP_FEE = FIXED_POINT * 25;

export { FIXED_POINT, MAX_TRANSACTION_AMOUNT };
