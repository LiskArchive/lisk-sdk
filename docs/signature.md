# `lisk signature`

Commands relating to signatures for Lisk transactions from multisignature accounts.

* [`lisk signature:broadcast [SIGNATURE]`](#lisk-signature-broadcast-signature)
* [`lisk signature:create [TRANSACTION]`](#lisk-signature-create-transaction)

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

## `lisk signature:create [TRANSACTION]`

Create a signature object for a transaction from a multisignature account.

```
USAGE
  $ lisk signature:create [TRANSACTION]

ARGUMENTS
  TRANSACTION  Transaction in JSON format.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -p, --passphrase=passphrase
      Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --passphrase=prompt (default behaviour)
      	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
      	- --passphrase=env:SECRET_PASSPHRASE
      	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
      	- --passphrase=stdin (takes one line only)

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Create a signature object for a transaction from a multisignature account.
  Accepts a stringified JSON transaction as an argument.

EXAMPLE
  signature:create
  '{"amount":"10","recipientId":"8050281191221330746L","senderPublicKey":"3358a1562f9babd523a768e700bb12ad58f230f8403105
  5802dc0ea58cef1e1b","timestamp":59353522,"type":0,"asset":{},"signature":"b84b95087c381ad25b5701096e2d9366ffd04037dcc9
  41cd0747bfb0cf93111834a6c662f149018be4587e6fc4c9f5ba47aa5bbbd3dd836988f153aa8258e604"}'
```
