/*
  DESCRIPTION: Gets delegates for list of public keys

  PARAMETERS:
      to be documented
*/

SELECT ENCODE("publicKey", 'hex') AS "publicKey",
       username,
       address
FROM mem_accounts
WHERE "isDelegate" = 1
  AND ENCODE("publicKey", 'hex') IN ($1:csv)
ORDER BY vote ASC,
         "publicKey" DESC
