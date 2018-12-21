/*
 * Copyright © 2018 Lisk Foundation
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

SELECT
	"address",
	ENCODE("publicKey", 'hex') as "publicKey",
	ENCODE("secondPublicKey", 'hex') as "publicKey",
	"username",
	"isDelegate",
	"secondSignature",
	"balance",
	"multimin" as "multiMin",
	"multilifetime" as "multiLifetime",
	"nameexist" as "nameExist",
	"fees",
	"rewards",
	"producedBlocks",
	"missedBlocks",
	"rank",
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
	) as "votes",
	(SELECT array_agg("dependentId")
		FROM mem_accounts2u_delegates
		WHERE "accountId" = mem_accounts.address
	) as "votes",
	(SELECT array_agg("dependentId")
  		FROM mem_accounts2multisignatures
  		WHERE "accountId" = mem_accounts.address
	) as "members",
	(SELECT array_agg("dependentId")
  		FROM mem_accounts2u_multisignatures
  		WHERE "accountId" = mem_accounts.address
	) as "u_members"
FROM
	mem_accounts

${parsedFilters:raw}

${parsedSort:raw}

LIMIT ${limit}
OFFSET ${offset}
