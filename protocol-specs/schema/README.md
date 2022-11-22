# Lisk Protocol Specs Schema

Following document will specify the format and validation specification in form of JSON-Schema. You can find the [raw json schema here](./lisk_protocol_specs.schema.json).

# LiskProtocolSpec Properties

| Property                | Type     | Required | Nullable       |
| :---------------------- | -------- | -------- | -------------- |
| [title](#title)         | `string` | Required | cannot be null |
| [summary](#summary)     | `string` | Required | cannot be null |
| [runner](#runner)       | `string` | Required | cannot be null |
| [handler](#handler)     | `string` | Required | cannot be null |
| [config](#config)       | `object` | Optional | cannot be null |
| [testCases](#testCases) | `array`  | Required | cannot be null |

## title

A string type value giving a short title of the spec

`title`

- is required
- Type: `string`
- cannot be null

### title Type

`string`

### title Constraints

**maximum length**: the maximum number of characters for this string is: `100`

**minimum length**: the minimum number of characters for this string is: `10`

## summary

A string type value explaining in detail purpose and value of the spec

`summary`

- is required
- Type: `string`
- cannot be null

### summary Type

`string`

### summary Constraints

**maximum length**: the maximum number of characters for this string is: `300`

**minimum length**: the minimum number of characters for this string is: `25`

## runner

A string identifier to point to a protocol spec name e.g. pos, bft

`runner`

- is required
- Type: `string`
- cannot be null

### runner Type

`string`

### runner Constraints

**maximum length**: the maximum number of characters for this string is: `100`

**minimum length**: the minimum number of characters for this string is: `3`

**pattern**: the string must match the following regular expression:

```regexp
[a-z0-9_]*
```

[try pattern](https://regexr.com/?expression=%5Ba-z0-9_%5D* 'try regular expression with regexr.com')

## handler

A string value to differentiate between same identifier for protocol spec

`handler`

- is required
- Type: `string`
- cannot be null

### handler Type

`string`

### handler Constraints

**maximum length**: the maximum number of characters for this string is: `100`

**minimum length**: the minimum number of characters for this string is: `3`

**pattern**: the string must match the following regular expression:

```regexp
[a-z0-9_]*
```

## config

A JSON object containing all necessary configurations for the environment in which these specs were generated and individual test case can be verified.

### Config Properties

| Property                      | Type     | Required | Nullable       |
| :---------------------------- | -------- | -------- | -------------- |
| [initialState](#initialState) | `object` | Optional | cannot be null |
| Additional Properties         | Any      | Optional | can be null    |

#### initialState

A JSON object represents basic chain state for individual spec to be executed.

`initialState`

- is optional
- Type: `object` ChainState
- cannot be null

## testCases

List down all test cases for current handler and runner

#### test case Properties

| Property                    | Type     | Required | Nullable       |
| :-------------------------- | -------- | -------- | -------------- |
| [description](#description) | `string` | Required | cannot be null |
| [config](#config)           | `object` | Optional | cannot be null |
| [input](#input)             | `object` | Required | cannot be null |
| [output](#output)           | `object` | Required | cannot be null |
