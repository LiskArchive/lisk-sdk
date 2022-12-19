/*
 * Copyright © 2021 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';

/**
 * The transaction tag is used during the signature creation to create unique signatures for transactions.
 *
 * @see [LIP 0037](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0037.md) for more information about message tags.
 */
export const TAG_TRANSACTION = utils.createMessageTag('TX');
