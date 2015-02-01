var args = require('minimist')(process.argv.slice(2));

var commands = {
	csv: require("./lib/csv"),
	nest: require("./lib/nest")
}

if (commands[args._[0].toLowerCase()]) {
	commands[args._[0].toLowerCase()](args);
}