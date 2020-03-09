// STRING : '' | '_eql' | '_ne' | '_like' | '_in' |
// NUMBER : '' |'_eql' | '_ne' | '_gt' | '_gte' | '_lt' | '_lte' | '_in' |
// BOOLEAN : '' | '_eql' | '_ne' |

export type TransactionStateStoreFilterKeys =
	// Default type filters

	// String
	| 'rowId'
	| 'rowId_eql'
	| 'rowId_ne'
	| 'rowId_like'
	| 'rowId_in'
	| 'transferData'
	| 'transferData_eql'
	| 'transferData_ne'
	| 'transferData_like'
	| 'transferData_in'
	| 'id'
	| 'id_eql'
	| 'id_ne'
	| 'id_like'
	| 'id_in'
	| 'blockId'
	| 'blockId_eql'
	| 'blockId_ne'
	| 'blockId_like'
	| 'blockId_in'
	| 'nonce'
	| 'nonce_eql'
	| 'nonce_ne'
	| 'nonce_like'
	| 'nonce_in'
	| 'senderPublicKey'
	| 'senderPublicKey_eql'
	| 'senderPublicKey_ne'
	| 'senderPublicKey_like'
	| 'senderPublicKey_in'
	| 'recipientId'
	| 'recipientId_eql'
	| 'recipientId_ne'
	| 'recipientId_like'
	| 'recipientId_in'
	| 'signatures'
	| 'signatures_eql'
	| 'signatures_ne'
	| 'signatures_like'
	| 'signatures_in'
	| 'asset'
	| 'asset_eql'
	| 'asset_ne'
	| 'asset_like'
	| 'asset_in'

	// Number
	| 'blockHeight'
	| 'blockHeight_eql'
	| 'blockHeight_ne'
	| 'blockHeight_gt'
	| 'blockHeight_gte'
	| 'blockHeight_lt'
	| 'blockHeight_lte'
	| 'blockHeight_in'
	| 'type'
	| 'type_eql'
	| 'type_ne'
	| 'type_gt'
	| 'type_gte'
	| 'type_lt'
	| 'type_lte'
	| 'type_in'
	| 'amount'
	| 'amount_eql'
	| 'amount_ne'
	| 'amount_gt'
	| 'amount_gte'
	| 'amount_lt'
	| 'amount_lte'
	| 'amount_in'
	| 'fee'
	| 'fee_eql'
	| 'fee_ne'
	| 'fee_gt'
	| 'fee_gte'
	| 'fee_lt'
	| 'fee_lte'
	| 'fee_in'

	// Custom
	| 'data_like';

type keyExpectNumber =
	| 'blockHeight'
	| 'blockHeight_eql'
	| 'blockHeight_ne'
	| 'blockHeight_gt'
	| 'blockHeight_gte'
	| 'blockHeight_lt'
	| 'blockHeight_lte'
	| 'type'
	| 'type_eql'
	| 'type_ne'
	| 'type_gt'
	| 'type_gte'
	| 'type_lt'
	| 'type_lte'
	| 'amount'
	| 'amount_eql'
	| 'amount_ne'
	| 'amount_gt'
	| 'amount_gte'
	| 'amount_lt'
	| 'amount_lte'
	| 'fee'
	| 'fee_eql'
	| 'fee_ne'
	| 'fee_gt'
	| 'fee_gte'
	| 'fee_lt'
	| 'fee_lte';

type keyExpectNumberArray =
	| 'blockHeight_in'
	| 'type_in'
	| 'amount_in'
	| 'fee_in';

type keyExpectStringArray =
	| 'rowId_in'
	| 'transferData_in'
	| 'id_in'
	| 'blockId_in'
	| 'nonce_in'
	| 'senderPublicKey_in'
	| 'recipientId_in'
	| 'signatures_in'
	| 'asset_in';

export type TransactionStateStoreFilterValues<
	Filter
> = Filter extends keyExpectNumber
	? number
	: Filter extends keyExpectNumberArray
	? number[]
	: Filter extends keyExpectStringArray
	? string[]
	: string; // Default to string

export type TransactionFilter = Partial<
	{
		[key in TransactionStateStoreFilterKeys]: TransactionStateStoreFilterValues<
			key
		>;
	}
>;
