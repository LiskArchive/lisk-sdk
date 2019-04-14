# `lisk passphrase`

Commands relating to Lisk passphrases.

* [`lisk passphrase:decrypt [ENCRYPTEDPASSPHRASE]`](#lisk-passphrase-decrypt-encryptedpassphrase)
* [`lisk passphrase:encrypt`](#lisk-passphrase-encrypt)

## `lisk passphrase:decrypt [ENCRYPTEDPASSPHRASE]`

Decrypts your secret passphrase using the password which was provided at the time of encryption.

```
USAGE
  $ lisk passphrase:decrypt [ENCRYPTEDPASSPHRASE]

ARGUMENTS
  ENCRYPTEDPASSPHRASE  Encrypted passphrase to decrypt.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -w, --password=password
      Specifies a source for your secret password. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --password=prompt (default behaviour)
      	- --password=pass:password123 (should only be used where security is not important)
      	- --password=env:PASSWORD
      	- --password=file:/path/to/my/password.txt (takes the first line only)
      	- --password=stdin (takes the first line only)

  --passphrase=passphrase
      Specifies a source for providing an encrypted passphrase to the command. If a string is provided directly as an
      argument, this option will be ignored. The encrypted passphrase must be provided via an argument or via this option.
      Sources must be one of `file` or `stdin`. In the case of `file`, a corresponding identifier must also be provided.

      	Note: if both an encrypted passphrase and the password are passed via stdin, the password must be the first line.

      	Examples:
      		- --passphrase file:/path/to/my/encrypted_passphrase.txt (takes the first line only)
      		- --passphrase stdin (takes the first line only)

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Decrypts your secret passphrase using the password which was provided at the time of encryption.

EXAMPLE
  passphrase:decrypt
  "iterations=1000000&cipherText=9b1c60&iv=5c8843f52ed3c0f2aa0086b0&salt=2240b7f1aa9c899894e528cf5b600e9c&tag=23c0111213
  4317a63bcf3d41ea74e83b&version=1"
```

## `lisk passphrase:encrypt`

Encrypts your secret passphrase under a password.

```
USAGE
  $ lisk passphrase:encrypt

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

  -w, --password=password
      Specifies a source for your secret password. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --password=prompt (default behaviour)
      	- --password=pass:password123 (should only be used where security is not important)
      	- --password=env:PASSWORD
      	- --password=file:/path/to/my/password.txt (takes the first line only)
      	- --password=stdin (takes the first line only)

  --outputPublicKey
      Includes the public key in the output. This option is provided for the convenience of node operators.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Encrypts your secret passphrase under a password.

EXAMPLE
  passphrase:encrypt
```
