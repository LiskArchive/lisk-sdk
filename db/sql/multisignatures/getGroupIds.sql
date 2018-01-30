/*
  DESCRIPTION: Gets list of addresses for group by a public key

  PARAMETERS:
  		- publicKey: Public key of a group (string)
*/

SELECT array_agg("accountId") AS "groupAccountIds"
FROM mem_accounts2multisignatures
WHERE "dependentId" = ${publicKey}
