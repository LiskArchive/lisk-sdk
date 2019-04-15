# Helm chart for deploy a lisk-core statefulset

This is the initial version of this chart, and it's still consided experimental.

## Requirements

- Helm installed on the local computer
- A kubernetes cluster with helm tiller deployed
- Support for persistent storage

## Installation

Inside chart main directory - where `Chart.yaml` is located:

### Install the chart

`helm install --name lisk-core .`

Replace the name `lisk-core` with your desired release name.

### Overriding default values

Create a yaml file with the variables you want to change - use `values.yaml` as template.

If you want to connect to mainnet for example:

```
persistence:
    storage: 20Gi
lisk:
    network: mainnet
    wsPort: 8001
    httpPort: 8000
```

Install with:

`helm install --name lisk-core . -f override.yaml`
