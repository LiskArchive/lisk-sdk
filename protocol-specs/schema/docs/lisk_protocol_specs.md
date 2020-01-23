# LiskProtocolSpec Schema

```txt
https://lisk.io/schemas/protocol_specs
```

Schema specification for JSON specs output

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                   |
| :------------------ | ---------- | -------------- | ------------ | :---------------- | --------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| Can be instantiated | Yes        | Unknown status | No           | Forbidden         | Forbidden             | none                | [lisk_protocol_specs.schema.json](../lisk_protocol_specs.schema.json 'open original schema') |

## LiskProtocolSpec Type

`object` ([LiskProtocolSpec](lisk_protocol_specs.md))

# LiskProtocolSpec Definitions

## Definitions group Account

Reference this group by using

```json
{ "$ref": "https://lisk.io/schemas/protocol_specs#/definitions/Account" }
```

| Property | Type | Required | Nullable | Defined by |
| :------- | ---- | -------- | -------- | :--------- |


## Definitions group Block

Reference this group by using

```json
{ "$ref": "https://lisk.io/schemas/protocol_specs#/definitions/Block" }
```

| Property | Type | Required | Nullable | Defined by |
| :------- | ---- | -------- | -------- | :--------- |


## Definitions group ChainState

Reference this group by using

```json
{ "$ref": "https://lisk.io/schemas/protocol_specs#/definitions/ChainState" }
```

| Property              | Type    | Required | Nullable       | Defined by                                                                                                                                                                 |
| :-------------------- | ------- | -------- | -------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [chain](#chain)       | `array` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-chain.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/chain')       |
| [accounts](#accounts) | `array` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-accounts.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/accounts') |

### chain

`chain`

- is optional
- Type: `object[]` ([Block](lisk_protocol_specs-definitions-chainstate-properties-chain-block.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-chain.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/chain')

#### chain Type

`object[]` ([Block](lisk_protocol_specs-definitions-chainstate-properties-chain-block.md))

#### chain Constraints

**unique items**: all items in this array must be unique. Duplicates are not allowed.

### accounts

`accounts`

- is optional
- Type: `object[]` ([Account](lisk_protocol_specs-definitions-chainstate-properties-accounts-account.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-accounts.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/accounts')

#### accounts Type

`object[]` ([Account](lisk_protocol_specs-definitions-chainstate-properties-accounts-account.md))

#### accounts Constraints

**unique items**: all items in this array must be unique. Duplicates are not allowed.

## Definitions group Config

Reference this group by using

```json
{ "$ref": "https://lisk.io/schemas/protocol_specs#/definitions/Config" }
```

| Property                      | Type     | Required | Nullable       | Defined by                                                                                                                                             |
| :---------------------------- | -------- | -------- | -------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [initialState](#initialState) | `object` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate.md 'https://lisk.io/schemas/protocol_specs#/definitions/Config/properties/initialState') |
| Additional Properties         | Any      | Optional | can be null    |                                                                                                                                                        |

### initialState

A JSON object represents basic chain state for individual spec to be executed.

`initialState`

- is optional
- Type: `object` ([ChainState](lisk_protocol_specs-definitions-chainstate.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate.md 'https://lisk.io/schemas/protocol_specs#/definitions/Config/properties/initialState')

#### initialState Type

`object` ([ChainState](lisk_protocol_specs-definitions-chainstate.md))

### Additional Properties

Additional properties are allowed and do not have to follow a specific schema

## Definitions group TestCase

Reference this group by using

```json
{ "$ref": "https://lisk.io/schemas/protocol_specs#/definitions/TestCase" }
```

| Property                    | Type     | Required | Nullable       | Defined by                                                                                                                                                                                        |
| :-------------------------- | -------- | -------- | -------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [description](#description) | `string` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-description.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/description') |
| [config](#config)           | `object` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-config.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/config')           |
| [input](#input)             | `object` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-input.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/input')             |
| [output](#output)           | `object` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/output')           |

### description

`description`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-description.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/description')

#### description Type

`string`

#### description Constraints

**maximum length**: the maximum number of characters for this string is: `300`

**minimum length**: the minimum number of characters for this string is: `10`

### config

A JSON object containing all necessary configurations for the environment in which these specs were generated and individual test case can be verified.

`config`

- is optional
- Type: `object` ([Config](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-config.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-config.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/config')

#### config Type

`object` ([Config](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-config.md))

### input

Input must be specified as a single object. If its complex scenario, it should be divided to multiple to have simple input/output expectations.

`input`

- is required
- Type: `object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-input.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-input.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/input')

#### input Type

`object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-input.md))

#### input Constraints

**minimum number of properties**: the minimum number of properties for this object is: `1`

### output

Output must be specified as a single object. If its complex scenario, it should be divided to multiple to have simple input/output expectations.

`output`

- is required
- Type: `object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/output')

#### output Type

`object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md))

#### output Constraints

**minimum number of properties**: the minimum number of properties for this object is: `1`

# LiskProtocolSpec Properties

| Property                | Type     | Required | Nullable       | Defined by                                                                                                                     |
| :---------------------- | -------- | -------- | -------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| [title](#title)         | `string` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-properties-title.md 'https://lisk.io/schemas/protocol_specs#/properties/title')         |
| [summary](#summary)     | `string` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-properties-summary.md 'https://lisk.io/schemas/protocol_specs#/properties/summary')     |
| [runner](#runner)       | `string` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-properties-runner.md 'https://lisk.io/schemas/protocol_specs#/properties/runner')       |
| [handler](#handler)     | `string` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-properties-handler.md 'https://lisk.io/schemas/protocol_specs#/properties/handler')     |
| [config](#config)       | `object` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-properties-config.md 'https://lisk.io/schemas/protocol_specs#/properties/config')       |
| [testCases](#testCases) | `array`  | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-properties-testcases.md 'https://lisk.io/schemas/protocol_specs#/properties/testCases') |

## title

A string type value giving a short title of the spec

`title`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-properties-title.md 'https://lisk.io/schemas/protocol_specs#/properties/title')

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
- defined in: [LiskProtocolSpec](lisk_protocol_specs-properties-summary.md 'https://lisk.io/schemas/protocol_specs#/properties/summary')

### summary Type

`string`

### summary Constraints

**maximum length**: the maximum number of characters for this string is: `300`

**minimum length**: the minimum number of characters for this string is: `25`

## runner

A string identifier to point to a protocol spec name e.g. dpos, bft

`runner`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-properties-runner.md 'https://lisk.io/schemas/protocol_specs#/properties/runner')

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
- defined in: [LiskProtocolSpec](lisk_protocol_specs-properties-handler.md 'https://lisk.io/schemas/protocol_specs#/properties/handler')

### handler Type

`string`

### handler Constraints

**maximum length**: the maximum number of characters for this string is: `100`

**minimum length**: the minimum number of characters for this string is: `3`

**pattern**: the string must match the following regular expression:

```regexp
[a-z0-9_]*
```

[try pattern](https://regexr.com/?expression=%5Ba-z0-9_%5D* 'try regular expression with regexr.com')

## config

A JSON object containing all necessary configurations for the environment in which these specs were generated and individual test case can be verified.

`config`

- is optional
- Type: `object` ([Config](lisk_protocol_specs-properties-config.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-properties-config.md 'https://lisk.io/schemas/protocol_specs#/properties/config')

### config Type

`object` ([Config](lisk_protocol_specs-properties-config.md))

## testCases

List down all test cases for current handler and runner

`testCases`

- is required
- Type: `object[]` ([Schema for a single test case](lisk_protocol_specs-definitions-schema-for-a-single-test-case.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-properties-testcases.md 'https://lisk.io/schemas/protocol_specs#/properties/testCases')

### testCases Type

`object[]` ([Schema for a single test case](lisk_protocol_specs-definitions-schema-for-a-single-test-case.md))
