/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

INSERT INTO mem_round
	("address", "amount", "delegate", "blockId", "round")
SELECT
	${address}, (${amount})::bigint, "dependentId", ${blockId}, ${round}
	FROM mem_accounts2delegates
	WHERE "accountId" = ${address}
