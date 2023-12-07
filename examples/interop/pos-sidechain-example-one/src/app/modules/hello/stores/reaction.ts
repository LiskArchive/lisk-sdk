import { Modules } from 'lisk-sdk';

export interface ReactionStoreData {
	reactions: {
		likes: Buffer[];
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
				likes: {
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

export class ReactionStore extends Modules.BaseStore<ReactionStoreData> {
	public schema = reactionStoreSchema;
}
