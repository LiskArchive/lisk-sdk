/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

INSERT INTO mem_round
	("address", "amount", "delegate", "blockId", "round")
SELECT
	${address}, (${balanceMode:raw}balance)::bigint, ${delegate}, ${blockId}, ${round}
	FROM mem_accounts
	WHERE address = ${address}
