# cupsdm [![Build Status](https://travis-ci.org/oodolabs/cupsdm.svg?branch=master)](https://travis-ci.org/oodolabs/cupsdm)

> CUPS drivers management tools


## Install

```
$ npm install cupsdm
```

## Usage

```js
const cupsdm = require('cupsdm');

const manager = cupsdm.createManger({autoAddPrinters: true});

manager.on('up', nodes => console.log('up:', nodes));
manager.on('down', nodes => console.log('down:', nodes));
manager.on('addPrinters', nodes => console.log('addPrinters:', nodes));

manager.start();

```

## License

MIT © [towyuan](https://github.com/oodolabs)
