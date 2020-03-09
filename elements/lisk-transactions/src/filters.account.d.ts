// STRING : '' | '_in' | '_eql' | '_ne' | '_like' |
// NUMBER : '' |'_eql' | '_ne' | '_gt' | '_gte' | '_lt' | '_lte' | '_in' |
// BOOLEAN : '' | '_eql' | '_ne' |

export type AccountStateStoreFilterKeys =
	// Default type filters

	| 'address'
	| 'address_in'
	| 'address_eql'
	| 'address_ne'
	| 'address_like'
	| 'username'
	| 'username_in'
	| 'username_eql'
	| 'username_ne'
	| 'username_like'
	| 'isDelegate'
	| 'isDelegate_eql'
	| 'isDelegate_ne'
	| 'nonce'
	| 'nonce_eql'
	| 'nonce_ne'
	| 'nameExist'
	| 'nameExist_eql'
	| 'nameExist_ne'
	| 'balance'
	| 'balance_eql'
	| 'balance_ne'
	| 'balance_gt'
	| 'balance_gte'
	| 'balance_lt'
	| 'balance_lte'
	| 'balance_in'
	| 'fees'
	| 'fees_eql'
	| 'fees_ne'
	| 'fees_gt'
	| 'fees_gte'
	| 'fees_lt'
	| 'fees_lte'
	| 'fees_in'
	| 'rewards'
	| 'rewards_eql'
	| 'rewards_ne'
	| 'rewards_gt'
	| 'rewards_gte'
	| 'rewards_lt'
	| 'rewards_lte'
	| 'rewards_in'
	| 'producedBlocks'
	| 'producedBlocks_eql'
	| 'producedBlocks_ne'
	| 'producedBlocks_gt'
	| 'producedBlocks_gte'
	| 'producedBlocks_lt'
	| 'producedBlocks_lte'
	| 'producedBlocks_in'
	| 'missedBlocks'
	| 'missedBlocks_eql'
	| 'missedBlocks_ne'
	| 'missedBlocks_gt'
	| 'missedBlocks_gte'
	| 'missedBlocks_lt'
	| 'missedBlocks_lte'
	| 'missedBlocks_in'
	| 'voteWeight'
	| 'voteWeight_eql'
	| 'voteWeight_ne'
	| 'voteWeight_gt'
	| 'voteWeight_gte'
	| 'voteWeight_lt'
	| 'voteWeight_lte'
	| 'voteWeight_in'
	| 'asset'
	| 'asset_in'
	| 'asset_eql'
	| 'asset_ne'
	| 'asset_like'
	| 'votedDelegatesPublicKeys'
	| 'votedDelegatesPublicKeys_in'
	| 'votedDelegatesPublicKeys_eql'
	| 'votedDelegatesPublicKeys_ne'
	| 'votedDelegatesPublicKeys_like'
	| 'keys'
	| 'keys_in'
	| 'keys_eql'
	| 'keys_ne'
	| 'keys_like'

	// Custom
	| 'asset_contains'
	| 'asset_exists';

type keyExpectBoolean =
	| 'isDelegate'
	| 'isDelegate_eql'
	| 'isDelegate_ne'
	| 'nonce'
	| 'nonce_eql'
	| 'nonce_ne'
	| 'nameExist'
	| 'nameExist_eql'
	| 'nameExist_ne'
	| 'asset_exists';

type keyExpectNumber =
	| 'balance'
	| 'balance_eql'
	| 'balance_ne'
	| 'balance_gt'
	| 'balance_gte'
	| 'balance_lt'
	| 'balance_lte'
	| 'fees'
	| 'fees_eql'
	| 'fees_ne'
	| 'fees_gt'
	| 'fees_gte'
	| 'fees_lt'
	| 'fees_lte'
	| 'rewards'
	| 'rewards_eql'
	| 'rewards_ne'
	| 'rewards_gt'
	| 'rewards_gte'
	| 'rewards_lt'
	| 'rewards_lte'
	| 'producedBlocks'
	| 'producedBlocks_eql'
	| 'producedBlocks_ne'
	| 'producedBlocks_gt'
	| 'producedBlocks_gte'
	| 'producedBlocks_lt'
	| 'producedBlocks_lte'
	| 'missedBlocks'
	| 'missedBlocks_eql'
	| 'missedBlocks_ne'
	| 'missedBlocks_gt'
	| 'missedBlocks_gte'
	| 'missedBlocks_lt'
	| 'missedBlocks_lte'
	| 'voteWeight'
	| 'voteWeight_eql'
	| 'voteWeight_ne'
	| 'voteWeight_gt'
	| 'voteWeight_gte'
	| 'voteWeight_lt'
	| 'voteWeight_lte';

type keyExpectNumberArray =
	| 'balance_in'
	| 'fees_in'
	| 'rewards_in'
	| 'producedBlocks_in'
	| 'missedBlocks_in'
	| 'voteWeight_in';

type keyExpectStringArray = 'address_in' | 'username_in';

export type AccountStateStoreFilterValues<
	Filter
> = Filter extends keyExpectBoolean
	? boolean
	: Filter extends keyExpectNumber
	? number
	: Filter extends keyExpectNumberArray
	? number[]
	: Filter extends keyExpectStringArray
	? string[]
	: string; // Default to string

export type AccountFilter = Partial<
	{
		[key in AccountStateStoreFilterKeys]: AccountStateStoreFilterValues<key>;
	}
>;
