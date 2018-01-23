/*
  DESCRIPTION: Inserts a fork statistics.

  PARAMETERS:
      delegatePublicKey - ?
      blockTimestamp - ?
      blockId - ?
      blockHeight - ?
      previousBlock - ?
      cause - ?
*/

INSERT INTO ${schema~}.forks_stat(
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
