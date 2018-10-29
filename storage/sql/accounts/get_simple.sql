SELECT
	address,
	ENCODE("publicKey", 'hex') as "publicKey",
	ENCODE("secondPublicKey", 'hex') as "publicKey",
	username,
	"isDelegate",
	"secondSignature",
	balance,
	multimin as "multiMin",
	multilifetime as "multiLifetime",
	nameexist as "nameExist",
	fees,
	rewards,
	"producedBlocks",
	"missedBlocks",
	rank
FROM
	mem_accounts
LIMIT ${limit} OFFSET ${offset}
