import { BaseStore } from 'lisk-sdk';

export interface ReactionStoreData {
	reactions: {
		like: Buffer[];
	};
}

export const reactionStoreSchema = {
	$id: '/hello/reaction',
	type: 'object',
	required: ['reactions'],
	properties: {
		reactions: {
			type: 'object',
			fieldNumber: 1,
			properties: {
				like: {
					type: 'array',
					fieldNumber: 1,
					items: {
						dataType: 'bytes',
					},
				},
			},
		},
	},
};

export class ReactionStore extends BaseStore<ReactionStoreData> {
	public schema = reactionStoreSchema;
}
