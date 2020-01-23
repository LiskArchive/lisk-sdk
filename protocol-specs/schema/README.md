# Lisk Protocol Specs Schema

Following document will specify the format and validation specification in form of JSON-Schema. You can find the [raw json schema here](./lisk_protocol_specs.schema.json). Also you can check a [readable version as well](./docs/lisk_protocol_specs.md#liskprotocolspec-properties).

## Custom Formats

Through out the specification we referred to custom formats e.g. amount, id. These formats are not supported by JSON-Schema by default.

Here are few constants we will be referring in below:

```
MAX_EIGHT_BYTE_NUMBER = 18446744073709551615
MAX_PUBLIC_KEY_LENGTH = 32
```

You can find details of those formats here.

| Format    | Description                                                                     |
| --------- | ------------------------------------------------------------------------------- |
| id        | Must be a number string and less than `MAX_EIGHT_BYTE_NUMBER`                   |
| signature | String value matching to regular expression `/^[a-f0-9]{128}$/`                 |
| publicKey | Hex format string value with byte size exactly equal to `MAX_PUBLIC_KEY_LENGTH` |
| hex       | Hex format string                                                               |
| amount    | Must be a number string                                                         |
