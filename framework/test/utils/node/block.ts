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
 *
 */

import { Block, Transaction } from '@liskhq/lisk-chain';
import { Node } from '../../../src/application/node';

interface Option {
	lastBlock?: Block;
	keypair?: { publicKey: Buffer; privateKey: Buffer };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createBlock = async (
	node: Node,
	transactions: Transaction[] = [],
	options: Option = {},
) => {
	const lastBlock = options.lastBlock ? options.lastBlock : node['_chain'].lastBlock;
	const currentSlot = node['_chain'].slots.getSlotNumber(lastBlock.header.timestamp) + 1;
	const timestamp = node['_chain'].slots.getSlotTime(currentSlot);
	const validator = await node['_chain'].getValidator(timestamp);

	const currentKeypair = node['_forger']['_keypairs'].get(validator.address);
	return node['_forger']['_create']({
		keypair: options.keypair
			? options.keypair
			: (currentKeypair as { publicKey: Buffer; privateKey: Buffer }),
		timestamp,
		seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
		transactions,
		previousBlock: lastBlock,
	});
};
