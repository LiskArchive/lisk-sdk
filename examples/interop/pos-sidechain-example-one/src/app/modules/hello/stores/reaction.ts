import { BaseStore } from 'lisk-sdk';

export interface ReactionStoreData {
	reactions: {
		like: Buffer[];
	};
}

export const reactionStoreSchema = {
	$id: '/hello/message',
	type: 'object',
	required: ['reactions'],
	properties: {
		reactions: {
			type: 'object',
			fieldNumber: 1,
			properties: {
				like: {
					dataType: 'array',
					items: {
						dataType: 'bytes',
						format: 'lisk32',
						fieldNumber: 1,
					},
				},
			},
		},
	},
};

export class ReactionStore extends BaseStore<ReactionStoreData> {
	public schema = reactionStoreSchema;
}
