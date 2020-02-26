/*
 * Copyright © 2019 Lisk Foundation
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

import * as randomstring from 'randomstring';
import * as stampit from 'stampit';
import * as faker from 'faker';

export const Block = stampit.compose({
	props: {
		id: '',
		blockSignature:
			'56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
		generatorPublicKey: '',
		payloadHash:
			'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
		payloadLength: 494,
		height: 489,
		previousBlockId: null,
		reward: '0',
		timestamp: 32578370,
		totalAmount: '10000000000000000',
		totalFee: '0',
		version: 0,
	},
	init({
		id,
		previousBlockId,
		generatorPublicKey,
		height,
		version,
		maxHeightPreviouslyForged,
		maxHeightPrevoted,
	}: {
		id: string;
		previousBlockId: string;
		generatorPublicKey: string;
		height: number;
		version: number;
		maxHeightPreviouslyForged: number;
		maxHeightPrevoted: number;
	}) {
		// Must to provide
		this.previousBlockId = previousBlockId;

		this.id = id || randomstring.generate({ charset: 'numeric', length: 19 });
		this.generatorPublicKey =
			generatorPublicKey ||
			randomstring
				.generate({ charset: '0123456789ABCDE', length: 64 })
				.toLowerCase();
		this.height = height || Math.floor(Math.random() * Math.floor(5000));

		this.reward = faker.random.number({ min: 10, max: 100 }).toString();
		this.totalFee = faker.random.number({ min: 100, max: 1000 }).toString();
		this.totalAmount = faker.random
			.number({ min: 1000, max: 10000 })
			.toString();
		this.version = version || 0;

		if (this.version === 2) {
			this.maxHeightPreviouslyForged = maxHeightPreviouslyForged || 0;
			this.maxHeightPrevoted = maxHeightPrevoted || 0;
		}
	},
});

export const BlockHeader = stampit.compose({
	props: {
		id: '',
		height: 0,
		maxHeightPreviouslyForged: 0,
		maxHeightPrevoted: 0,
		delegateMinHeightActive: 203,
		delegatePublicKey: '',
	},
	init({
		height = Math.floor(Math.random() * Math.floor(5000)),
		id = randomstring.generate({ charset: 'numeric', length: 19 }),
		delegatePublicKey = randomstring
			.generate({ charset: '0123456789ABCDE', length: 64 })
			.toLowerCase(),
		delegateMinHeightActive = 1,
		maxHeightPreviouslyForged = 0,
		maxHeightPrevoted = 0,
	}: {
		height: number;
		id: string;
		delegatePublicKey: string;
		delegateMinHeightActive: number;
		maxHeightPreviouslyForged: number;
		maxHeightPrevoted: number;
	}) {
		this.id = id;
		this.height = height;
		this.delegatePublicKey = delegatePublicKey;
		this.delegateMinHeightActive = delegateMinHeightActive;
		this.maxHeightPreviouslyForged = maxHeightPreviouslyForged;
		this.maxHeightPrevoted = maxHeightPrevoted;
	},
});
