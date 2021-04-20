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
export const postBlockEventSchema = {
	$id: 'monitor/postBlockEvent',
	type: 'object',
	required: ['block'],
	properties: {
		block: {
			type: 'string',
			format: 'hex',
		},
	},
};

export const transactionAnnouncementSchema = {
	$id: 'monitor/transactionAnnouncement',
	type: 'object',
	required: ['transactionIds'],
	properties: {
		transactionIds: {
			type: 'array',
			items: {
				type: 'string',
				format: 'hex',
			},
		},
	},
};
