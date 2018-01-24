/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

INSERT INTO mem_round
	("address", "amount", "delegate", "blockId", "round")

SELECT
	${address}, (-balance)::bigint, ${delegate}, ${blockId}, ${round}
	FROM mem_accounts
	WHERE address = ${address}
