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
	rank,

	"u_isDelegate",
	"u_secondSignature",
	"u_balance",
	"u_multimin" as "u_multiMin",
	"u_multilifetime" as "u_multiLifetime",
	"u_nameexist" as "u_nameExist",
	"u_username",
	(SELECT array_agg("dependentId")
		FROM mem_accounts2delegates
		WHERE "accountId" = mem_accounts.address
	) as "delegates",
	(SELECT array_agg("dependentId")
		FROM mem_accounts2u_delegates
		WHERE "accountId" = mem_accounts.address
	) as "u_delegates",
	(SELECT array_agg("dependentId")
  		FROM mem_accounts2multisignatures
  		WHERE "accountId" = mem_accounts.address
	) as "multisignatures",
	(SELECT array_agg("dependentId")
  		FROM mem_accounts2u_multisignatures
  		WHERE "accountId" = mem_accounts.address
	) as "u_multisignatures"
FROM
	mem_accounts
WHERE
	${parsedFilters:raw}
LIMIT ${limit} OFFSET ${offset}
