/*
  DESCRIPTION: Inserts a fork statistics (not sure) :)

  PARAMETERS:
      $1 - array of public keys
*/

INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause")
VALUES ($1, $2, $3, $4, $5, $6)
