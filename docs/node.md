# `lisk node`

Commands relating to Lisk node.

* [`lisk node:forging STATUS PUBLICKEY`](#lisk-node-forging-status-publickey)
* [`lisk node:get`](#lisk-node-get)

## `lisk node:forging STATUS PUBLICKEY`

Updates the forging status of a node.

```
USAGE
  $ lisk node:forging STATUS PUBLICKEY

ARGUMENTS
  STATUS     (enable|disable) Desired forging status.
  PUBLICKEY  Public key of the delegate whose status should be updated.

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

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Updates the forging status of a node.

EXAMPLES
  node:forging enable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
  node:forging disable 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
```

## `lisk node:get`

Gets information about a node.

```
USAGE
  $ lisk node:get

OPTIONS
  -j, --[no-]json   Prints output in JSON format. You can change the default behaviour in your config.json file.

  --forging-status  Additionally provides information about forging status.

  --[no-]pretty     Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                    can change the default behaviour in your config.json file.

DESCRIPTION
  Gets information about a node.

EXAMPLES
  node:get
  node:get --forging-status
```
