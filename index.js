#!/usr/bin/env node

var args = require('minimist')(process.argv.slice(2));

if (args._.length < 2) {
	console.log("You need to specify a command (e.g. `csv`) and a file (e.g. `data/usa_00001`)");
	return;
}

var commands = {
	csv: require("./lib/csv"),
	nest: require("./lib/nest")
	//sqlite: require("./lib/sqlite")
}

if (commands[args._[0].toLowerCase()]) {
	commands[args._[0].toLowerCase()](args);
}