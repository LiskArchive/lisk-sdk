# `lisk signature`

Commands relating to signatures for Lisk transactions from multisignature accounts.

* [`lisk signature:broadcast [SIGNATURE]`](#lisk-signature-broadcast-signature)

## `lisk signature:broadcast [SIGNATURE]`

Broadcasts a signature for a transaction from a multisignature account.

```
USAGE
  $ lisk signature:broadcast [SIGNATURE]

ARGUMENTS
  SIGNATURE  Signature to broadcast.

OPTIONS
  -j, --[no-]json  Prints output in JSON format. You can change the default behaviour in your config.json file.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.

DESCRIPTION
  Broadcasts a signature for a transaction from a multisignature account.
  Accepts a stringified JSON signature as an argument, or a signature can be piped from a previous command.
  If piping make sure to quote out the entire command chain to avoid piping-related conflicts in your shell.

EXAMPLES
  signature:broadcast '{"transactionId":"abcd1234","publicKey":"abcd1234","signature":"abcd1234"}'
  echo '{"transactionId":"abcd1234","publicKey":"abcd1234","signature":"abcd1234"}' | lisk signature:broadcast
```
