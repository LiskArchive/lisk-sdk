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

| Property                            | Type         | Required | Nullable       | Defined by                                                                                                                                                                         |
| :---------------------------------- | ------------ | -------- | -------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [address](#address)                 | `string`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-address.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/address')                 |
| [publicKey](#publicKey)             | `string`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-publickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/publicKey')             |
| [secondPublicKey](#secondPublicKey) | Unknown Type | Optional | can be null    | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-secondpublickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/secondPublicKey') |
| [username](#username)               | Unknown Type | Optional | can be null    | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-username.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/username')               |
| [isDelegate](#isDelegate)           | `boolean`    | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-isdelegate.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/isDelegate')           |
| [secondSignature](#secondSignature) | `boolean`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-secondsignature.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/secondSignature') |
| [nameExist](#nameExist)             | `boolean`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-nameexist.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/nameExist')             |
| [balance](#balance)                 | Unknown Type | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-balance.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/balance')                 |
| [multiMin](#multiMin)               | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-multimin.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/multiMin')               |
| [multiLifetime](#multiLifetime)     | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-multilifetime.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/multiLifetime')     |
| [missedBlocks](#missedBlocks)       | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-missedblocks.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/missedBlocks')       |
| [producedBlocks](#producedBlocks)   | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-producedblocks.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/producedBlocks')   |
| [rank](#rank)                       | Unknown Type | Optional | can be null    | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-rank.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/rank')                       |
| [fees](#fees)                       | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-fees.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/fees')                       |
| [rewards](#rewards)                 | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-rewards.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/rewards')                 |
| [vote](#vote)                       | Unknown Type | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-vote.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/vote')                       |
| [productivity](#productivity)       | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-productivity.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/productivity')       |

### address

`address`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-address.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/address')

#### address Type

`string`

### publicKey

`publicKey`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-publickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/publicKey')

#### publicKey Type

`string`

### secondPublicKey

`secondPublicKey`

- is optional
- Type: `string`
- can be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-secondpublickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/secondPublicKey')

#### secondPublicKey Type

`string`

### username

`username`

- is optional
- Type: `string`
- can be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-username.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/username')

#### username Type

`string`

### isDelegate

`isDelegate`

- is required
- Type: `boolean`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-isdelegate.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/isDelegate')

#### isDelegate Type

`boolean`

### secondSignature

`secondSignature`

- is optional
- Type: `boolean`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-secondsignature.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/secondSignature')

#### secondSignature Type

`boolean`

### nameExist

`nameExist`

- is optional
- Type: `boolean`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-nameexist.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/nameExist')

#### nameExist Type

`boolean`

### balance

`balance`

- is required
- Type: any of the folllowing: `string` or `integer` ([Details](lisk_protocol_specs-definitions-account-properties-balance.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-balance.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/balance')

#### balance Type

any of the folllowing: `string` or `integer` ([Details](lisk_protocol_specs-definitions-account-properties-balance.md))

### multiMin

`multiMin`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-multimin.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/multiMin')

#### multiMin Type

`integer`

### multiLifetime

`multiLifetime`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-multilifetime.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/multiLifetime')

#### multiLifetime Type

`integer`

### missedBlocks

`missedBlocks`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-missedblocks.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/missedBlocks')

#### missedBlocks Type

`integer`

### producedBlocks

`producedBlocks`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-producedblocks.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/producedBlocks')

#### producedBlocks Type

`integer`

### rank

`rank`

- is optional
- Type: `integer`
- can be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-rank.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/rank')

#### rank Type

`integer`

### fees

`fees`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-fees.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/fees')

#### fees Type

`integer`

### rewards

`rewards`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-rewards.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/rewards')

#### rewards Type

`integer`

### vote

`vote`

- is optional
- Type: any of the folllowing: `string` or `integer` ([Details](lisk_protocol_specs-definitions-account-properties-vote.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-vote.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/vote')

#### vote Type

any of the folllowing: `string` or `integer` ([Details](lisk_protocol_specs-definitions-account-properties-vote.md))

### productivity

`productivity`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-productivity.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/productivity')

#### productivity Type

`integer`

## Definitions group Block

Reference this group by using

```json
{ "$ref": "https://lisk.io/schemas/protocol_specs#/definitions/Block" }
```

| Property                                      | Type          | Required | Nullable       | Defined by                                                                                                                                                                               |
| :-------------------------------------------- | ------------- | -------- | -------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [id](#id)                                     | `string`      | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-id.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/id')                                     |
| [height](#height)                             | `integer`     | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-height.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/height')                             |
| [blockSignature](#blockSignature)             | `string`      | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-blocksignature.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/blockSignature')             |
| [generatorPublicKey](#generatorPublicKey)     | `string`      | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-generatorpublickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/generatorPublicKey')     |
| [numberOfTransactions](#numberOfTransactions) | `integer`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-numberoftransactions.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/numberOfTransactions') |
| [payloadHash](#payloadHash)                   | `string`      | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-payloadhash.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/payloadHash')                   |
| [payloadLength](#payloadLength)               | `integer`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-payloadlength.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/payloadLength')               |
| [previousBlockId](#previousBlockId)           | `string`      | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-previousblockid.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/previousBlockId')           |
| [timestamp](#timestamp)                       | `integer`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-timestamp.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/timestamp')                       |
| [totalAmount](#totalAmount)                   | Not specified | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-totalamount.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/totalAmount')                   |
| [totalFee](#totalFee)                         | Not specified | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-totalfee.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/totalFee')                         |
| [reward](#reward)                             | Not specified | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-reward.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/reward')                             |
| [transactions](#transactions)                 | `array`       | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-transactions.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/transactions')                 |
| [version](#version)                           | `integer`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-version.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/version')                           |

### id

`id`

- is optional
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-id.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/id')

#### id Type

`string`

#### id Constraints

**maximum length**: the maximum number of characters for this string is: `20`

**minimum length**: the minimum number of characters for this string is: `1`

**unknown format**: the value of this string must follow the format: `id`

### height

`height`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-height.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/height')

#### height Type

`integer`

### blockSignature

`blockSignature`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-blocksignature.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/blockSignature')

#### blockSignature Type

`string`

#### blockSignature Constraints

**unknown format**: the value of this string must follow the format: `signature`

### generatorPublicKey

`generatorPublicKey`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-generatorpublickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/generatorPublicKey')

#### generatorPublicKey Type

`string`

#### generatorPublicKey Constraints

**unknown format**: the value of this string must follow the format: `publicKey`

### numberOfTransactions

`numberOfTransactions`

- is required
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-numberoftransactions.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/numberOfTransactions')

#### numberOfTransactions Type

`integer`

### payloadHash

`payloadHash`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-payloadhash.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/payloadHash')

#### payloadHash Type

`string`

#### payloadHash Constraints

**unknown format**: the value of this string must follow the format: `hex`

### payloadLength

`payloadLength`

- is required
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-payloadlength.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/payloadLength')

#### payloadLength Type

`integer`

### previousBlockId

`previousBlockId`

- is optional
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-previousblockid.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/previousBlockId')

#### previousBlockId Type

`string`

#### previousBlockId Constraints

**maximum length**: the maximum number of characters for this string is: `20`

**minimum length**: the minimum number of characters for this string is: `1`

**unknown format**: the value of this string must follow the format: `id`

### timestamp

`timestamp`

- is required
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-timestamp.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/timestamp')

#### timestamp Type

`integer`

### totalAmount

`totalAmount`

- is required
- Type: unknown
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-totalamount.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/totalAmount')

#### totalAmount Type

unknown

#### totalAmount Constraints

**unknown format**: the value of this string must follow the format: `amount`

### totalFee

`totalFee`

- is required
- Type: unknown
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-totalfee.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/totalFee')

#### totalFee Type

unknown

#### totalFee Constraints

**unknown format**: the value of this string must follow the format: `amount`

### reward

`reward`

- is required
- Type: unknown
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-reward.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/reward')

#### reward Type

unknown

#### reward Constraints

**unknown format**: the value of this string must follow the format: `amount`

### transactions

`transactions`

- is required
- Type: `array`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-transactions.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/transactions')

#### transactions Type

`array`

#### transactions Constraints

**unique items**: all items in this array must be unique. Duplicates are not allowed.

### version

`version`

- is required
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-version.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/version')

#### version Type

`integer`

#### version Constraints

**minimum**: the value of this number must greater than or equal to: `0`

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
- Type: `object[]` ([Block](lisk_protocol_specs-definitions-block.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-chain.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/chain')

#### chain Type

`object[]` ([Block](lisk_protocol_specs-definitions-block.md))

#### chain Constraints

**unique items**: all items in this array must be unique. Duplicates are not allowed.

### accounts

`accounts`

- is optional
- Type: `object[]` ([Account](lisk_protocol_specs-definitions-account.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate-properties-accounts.md 'https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/accounts')

#### accounts Type

`object[]` ([Account](lisk_protocol_specs-definitions-account.md))

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
