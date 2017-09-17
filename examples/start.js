const cupsdm = require('..');

const manager = cupsdm.createManger({autoAddPrinters: true});

manager.on('up', nodes => console.log('up:', nodes));
manager.on('down', nodes => console.log('down:', nodes));
manager.on('addPrinters', nodes => console.log('addPrinters:', nodes));

manager.start();
