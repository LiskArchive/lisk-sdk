/*
  DESCRIPTION: Inserts a fork statistics (not sure) :)

  PARAMETERS:
      delegatePublicKey - ?
      blockTimestamp - ?
      blockId - ?
      blockHeight - ?
      previousBlock - ?
      cause - ?
*/

INSERT INTO ${schema~}.forks_stat (
  "delegatePublicKey",
  "blockTimestamp",
  "blockId",
  "blockHeight",
  "previousBlock",
  "cause"
)
VALUES (
  ${delegatePublicKey},
  ${blockTimestamp},
  ${blockId},
  ${blockHeight},
  ${previousBlock},
  ${cause}
)
