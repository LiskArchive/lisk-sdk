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
import { Node } from '../../../src/node';
import { getUsedHashOnions, setUsedHashOnions } from '../../../src/node/forger/data_access';

interface Option {
	lastBlock?: Block;
	keypair?: { publicKey: Buffer; privateKey: Buffer };
}

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

export const createValidBlock = async (
	node: Node,
	transactions: Transaction[] = [],
	targetValidator?: Buffer,
	skipMode = false,
): Promise<Block> => {
	const { lastBlock } = node['_chain'];
	let currentSlot = node['_chain'].slots.getSlotNumber(lastBlock.header.timestamp) + 1;
	let timestamp = node['_chain'].slots.getSlotTime(currentSlot);
	let validator = await node['_chain'].getValidator(timestamp);
	if (targetValidator) {
		while (
			(skipMode && validator.address.equals(targetValidator)) ||
			(!skipMode && !validator.address.equals(targetValidator))
		) {
			currentSlot += 1;
			timestamp = node['_chain'].slots.getSlotTime(currentSlot);
			validator = await node['_chain'].getValidator(timestamp);
		}
	}

	const delegateAddress = validator.address;
	const nextHeight = lastBlock.header.height + 1;
	const usedHashOnions = await getUsedHashOnions(node['_forgerDB']);
	const nextHashOnion = node['_forger']['_getNextHashOnion'](
		usedHashOnions,
		validator.address,
		nextHeight,
	);
	const index = usedHashOnions.findIndex(
		ho => ho.address.equals(delegateAddress) && ho.count === nextHashOnion.count,
	);
	const nextUsedHashOnion = {
		count: nextHashOnion.count,
		address: delegateAddress,
		height: nextHeight,
	};
	if (index > -1) {
		// Overwrite the hash onion if it exists
		usedHashOnions[index] = nextUsedHashOnion;
	} else {
		usedHashOnions.push(nextUsedHashOnion);
	}
	await setUsedHashOnions(node['_forgerDB'], usedHashOnions);

	const currentKeypair = node['_forger']['_keypairs'].get(validator.address);
	return node['_forger']['_create']({
		keypair: currentKeypair as { publicKey: Buffer; privateKey: Buffer },
		timestamp,
		seedReveal: nextHashOnion.hash,
		transactions,
		previousBlock: lastBlock,
	});
};
