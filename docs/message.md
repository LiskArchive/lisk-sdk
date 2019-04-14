# `lisk message`

Commands relating to user messages.

* [`lisk message:decrypt SENDERPUBLICKEY NONCE [MESSAGE]`](#lisk-message-decrypt-senderpublickey-nonce-message)
* [`lisk message:encrypt RECIPIENTPUBLICKEY [MESSAGE]`](#lisk-message-encrypt-recipientpublickey-message)
* [`lisk message:sign [MESSAGE]`](#lisk-message-sign-message)
* [`lisk message:verify PUBLICKEY SIGNATURE [MESSAGE]`](#lisk-message-verify-publickey-signature-message)

## `lisk message:decrypt SENDERPUBLICKEY NONCE [MESSAGE]`

Decrypts a previously encrypted message from a given sender public key for a known nonce using your secret passphrase.

```
USAGE
  $ lisk message:decrypt SENDERPUBLICKEY NONCE [MESSAGE]

ARGUMENTS
  SENDERPUBLICKEY  Public key of the sender of the message.
  NONCE            Nonce used during encryption.
  MESSAGE          Encrypted message.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -m, --message=message
      Specifies a source for providing a message to the command. If a string is provided directly as an argument, this
      option will be ignored. The message must be provided via an argument or via this option. Sources must be one of
      `file` or `stdin`. In the case of `file`, a corresponding identifier must also be provided.
      	Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.
      	Examples:
      	- --message=file:/path/to/my/message.txt
      	- --message=stdin

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
  Decrypts a previously encrypted message from a given sender public key for a known nonce using your secret passphrase.

EXAMPLE
  message:decrypt bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0
  4b800d90d54eda4d093b5e4e6bf9ed203bc90e1560bd628d dcaa605af45a4107a699755237b4c08e1ef75036743d7e4814dea7
```

## `lisk message:encrypt RECIPIENTPUBLICKEY [MESSAGE]`

Encrypts a message for a given recipient public key using your secret passphrase.

```
USAGE
  $ lisk message:encrypt RECIPIENTPUBLICKEY [MESSAGE]

ARGUMENTS
  RECIPIENTPUBLICKEY  Public key of the recipient of the message.
  MESSAGE             Message to encrypt.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -m, --message=message
      Specifies a source for providing a message to the command. If a string is provided directly as an argument, this
      option will be ignored. The message must be provided via an argument or via this option. Sources must be one of
      `file` or `stdin`. In the case of `file`, a corresponding identifier must also be provided.
      	Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.
      	Examples:
      	- --message=file:/path/to/my/message.txt
      	- --message=stdin

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
  Encrypts a message for a given recipient public key using your secret passphrase.

EXAMPLE
  message:encrypt bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 "Hello world"
```

## `lisk message:sign [MESSAGE]`

Signs a message using your secret passphrase.

```
USAGE
  $ lisk message:sign [MESSAGE]

ARGUMENTS
  MESSAGE  Message to sign.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -m, --message=message
      Specifies a source for providing a message to the command. If a string is provided directly as an argument, this
      option will be ignored. The message must be provided via an argument or via this option. Sources must be one of
      `file` or `stdin`. In the case of `file`, a corresponding identifier must also be provided.
      	Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.
      	Examples:
      	- --message=file:/path/to/my/message.txt
      	- --message=stdin

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
  Signs a message using your secret passphrase.

EXAMPLE
  message:sign "Hello world"
```

## `lisk message:verify PUBLICKEY SIGNATURE [MESSAGE]`

Verifies a signature for a message using the signer’s public key.

```
USAGE
  $ lisk message:verify PUBLICKEY SIGNATURE [MESSAGE]

ARGUMENTS
  PUBLICKEY  Public key of the signer of the message.
  SIGNATURE  Signature to verify.
  MESSAGE    Message to verify.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -m, --message=message
      Specifies a source for providing a message to the command. If a string is provided directly as an argument, this
      option will be ignored. The message must be provided via an argument or via this option. Sources must be one of
      `file` or `stdin`. In the case of `file`, a corresponding identifier must also be provided.
      	Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.
      	Examples:
      	- --message=file:/path/to/my/message.txt
      	- --message=stdin

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Verifies a signature for a message using the signer’s public key.

EXAMPLE
  message:verify 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
  2a3ca127efcf7b2bf62ac8c3b1f5acf6997cab62ba9fde3567d188edcbacbc5dc8177fb88d03a8691ce03348f569b121bca9e7a3c43bf5c056382f
  35ff843c09 "Hello world"
```
