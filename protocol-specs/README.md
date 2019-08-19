# Test Generators for Lisk Protocol

This directory contains all the generators for JSON tests, consumed by Lisk Core client implementations.

## How to run generators

### Running all test generators

This runs all of the generators.

```bash
$ cd protocol-specs
$ npm run generate-all-specs
```

### Running a single generator

To run a single generator execute the following commands replacing `generator_name`
with the name of the generator you wish to run:

```bash
$ cd protocol-specs/generators/{generator_name}
$ node index.js
```
