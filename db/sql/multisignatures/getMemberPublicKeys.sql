/*
  DESCRIPTION: Gets list of public keys for a member address

  PARAMETERS:
  		- address: Address of a member (string)
*/

SELECT array_agg("dependentId") AS "memberAccountKeys"
FROM mem_accounts2multisignatures
WHERE "accountId" = ${address}
