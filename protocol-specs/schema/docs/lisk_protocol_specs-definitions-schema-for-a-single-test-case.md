# Schema for a single test case Schema

```txt
https://lisk.io/schemas/protocol_specs#/definitions/TestCase
```

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                     |
| :------------------ | ---------- | -------------- | ------------ | :---------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Forbidden             | none                | [lisk_protocol_specs.schema.json\*](../lisk_protocol_specs.schema.json 'open original schema') |

## TestCase Type

`object` ([Schema for a single test case](lisk_protocol_specs-definitions-schema-for-a-single-test-case.md))

# Schema for a single test case Properties

| Property                    | Type     | Required | Nullable       | Defined by                                                                                                                                                                                        |
| :-------------------------- | -------- | -------- | -------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [description](#description) | `string` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-description.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/description') |
| [config](#config)           | `object` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-config.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/config')                                                    |
| [input](#input)             | `object` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-input.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/input')             |
| [output](#output)           | `object` | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/output')           |

## description

`description`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-description.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/description')

### description Type

`string`

### description Constraints

**maximum length**: the maximum number of characters for this string is: `300`

**minimum length**: the minimum number of characters for this string is: `10`

## config

A JSON object containing all necessary configurations for the environment in which these specs were generated and individual test case can be verified.

`config`

- is optional
- Type: `object` ([Config](lisk_protocol_specs-definitions-config.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-config.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/config')

### config Type

`object` ([Config](lisk_protocol_specs-definitions-config.md))

## input

Input must be specified as a single object. If its complex scenario, it should be divided to multiple to have simple input/output expectations.

`input`

- is required
- Type: `object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-input.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-input.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/input')

### input Type

`object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-input.md))

### input Constraints

**minimum number of properties**: the minimum number of properties for this object is: `1`

## output

Output must be specified as a single object. If its complex scenario, it should be divided to multiple to have simple input/output expectations.

`output`

- is required
- Type: `object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md 'https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/output')

### output Type

`object` ([Details](lisk_protocol_specs-definitions-schema-for-a-single-test-case-properties-output.md))

### output Constraints

**minimum number of properties**: the minimum number of properties for this object is: `1`
