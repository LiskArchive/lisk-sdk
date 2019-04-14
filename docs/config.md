# `lisk config`

Manages Lisk Commander configuration.

* [`lisk config:set VARIABLE [VALUES]`](#lisk-config-set-variable-values)
* [`lisk config:show`](#lisk-config-show)

## `lisk config:set VARIABLE [VALUES]`

Sets configuration.

```
USAGE
  $ lisk config:set VARIABLE [VALUES]

OPTIONS
  -j, --[no-]json  Prints output in JSON format. You can change the default behaviour in your config.json file.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.

DESCRIPTION
  Sets configuration.
  ...
  Variables available: api.nodes, api.network, json, pretty.

EXAMPLES
  config:set json true
  config:set api.network main
  config:set api.nodes https://127.0.0.1:4000,http://mynode.com:7000
```

## `lisk config:show`

Prints the current configuration.

```
USAGE
  $ lisk config:show

OPTIONS
  -j, --[no-]json  Prints output in JSON format. You can change the default behaviour in your config.json file.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.

DESCRIPTION
  Prints the current configuration.

EXAMPLE
  config:show
```
