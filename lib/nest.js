var fs = require("fs");
var readline = require("readline");
var combination = require('./combine');
var weightedMedian = require('./weightedMedian');
var weightedQuartile = require('./weightedQuantiles');
var streamCSV = require("node-stream-csv");

module.exports = function(opts) {
	var hash_key = opts.vars.split(",");

	if (opts.combos) {	
		hash_keys = combination(hash_key);
		hash_keys.push([]);

		// add placeholder keys
		hash_keys = hash_keys.map(function(key) {
			for (var i = 0; i < hash_key.length; i += 1) {
				if (key[i] != hash_key[i]) {
					key.splice(i, 0, "ALL");
				}
			}
			return key;
		});
	} else {
		hash_keys = [hash_key];
	}

	if (opts.dependents) {
		opts.dependents = opts.dependents.split(",");	
	} else {
		opts.dependents = [];
	}

	var data = {},
		line_count = 0;

	var instream = fs.createReadStream(opts._[1] + "_refined.tsv", { encoding: 'utf8' });
	
	var rl = readline.createInterface({
	    input: instream,
		output: process.stdout,
	    terminal: false
	});

	var headers;

	rl.on('line', function(line) {
		if (line_count % 1000 === 0) {
			process.stdout.write("Scanned " + line_count + " lines\r");
		}
		line_count += 1;

		line = line.split("\t");
		if (!headers) {
			headers = line;
		} else {
			var datum = {};
			headers.forEach(function(header,h) {
				datum[header] = line[h]; 
			});

			hash_keys.forEach(function(hash_key) {
				var key = hash_key.map(function(d) { return d === "ALL" ? "ALL" : datum[d] }).join("_");

			    if (!data[key]) {
			    	data[key] = {
			    		props: {},
			    		count: 0,
			    		population: 0
			    	};

			    	opts.dependents.forEach(function(dependent) {
			    		data[key].values = data[key].values || {};
			    		data[key].values[dependent] = {};
			    	});

			    	hash_key.forEach(function(d, i) {
			    		if (d === "ALL") {
			    			data[key].props[hash_keys[0][i]] = "ALL";
			    		} else {
				    		data[key].props[d] = datum[d];
				    	}
			    	});
			    }
			    data[key].count += 1;
			    data[key].population += parseInt(datum.PERWT, 10);

		    	opts.dependents.forEach(function(dependent) {
		    		data[key].values[dependent][datum[dependent]] = data[key].values[dependent][datum[dependent]] || { count: 0, population: 0 };
		    		data[key].values[dependent][datum[dependent]].count += 1;
		    		data[key].values[dependent][datum[dependent]].population += parseInt(datum.PERWT, 10);
		    	});
			});
		}
	});

	rl.on('close', function() {
		fs.writeFileSync("test.json", JSON.stringify(data, null, 2));
		// convert to csv
		var csv = "";
		var variables = opts.vars.split(",");
		header = variables.concat(["count", "population"]);
		csv += header.join("\t") + "\n";
		Object.keys(data).forEach(function(hash) {
			var combo = data[hash];
			csv += variables.map(function(d) { return combo.props[d] }).join("\t") + "\t" + [combo.count, combo.population].join("\t") + "\n";
		});
		fs.writeFileSync("test.tsv", csv);
	});
}

function calculateKey(keyIndex) {
	var headers,
		count = 0;

	var output = hash_key.join("\t") + "\t" + ["COUNT","TOTAL","INCOME","INCOME_ADJ"].join("\t") + "\t";

	for (var l = 5; l <= 100; l += 5) {
		output += "Q" + l + (l == 100 ? "\n" : "\t");
	}

	var instream = fs.createReadStream(opts._[0] + "_refined.tsv", { encoding: 'utf8' });
	
	var rl = readline.createInterface({
	    input: instream,
		output: process.stdout,
	    terminal: false
	});

	var key = hash_keys[keyIndex];
	delete data;
	data = {};


	//console.log("Getting data for key " + key.join(", "));

	rl.on('line', function(line) {
		count += 1;
		if (count % 10000 === 0) {
			process.stdout.write("Scanned " + count + " lines\r");
		}

		line = line.split("\t");
		if (!headers) {
			headers = line;
		} else {
			var datum = {};
			headers.forEach(function(header,h) {
				datum[header] = line[h]; 
			});

			//console.log(datum);

			if (datum[INC_KEY] != "" && datum.WKSWORK2GROUP == "All year" && datum.AGEGROUP != "Under 18") {
				var hash = key.map(function(d) { return d === "ALL" ? "ALL" : datum[d] }).join("_");
				if (!data[hash]) {
					data[hash] = {
						population: 0
					};
					data[INC_KEY] = [];
				}
				data[hash].population += parseInt(datum.PERWT, 10);
				data[hash][INC_KEY].push([parseInt(datum[INC_KEY], 10), parseInt(datum.PERWT, 10)]);
			}
		}
	});

	rl.on('close', function() {
		for (var hash in data) {
			console.log(hash, data[hash]);
			// properties for this group
			output += hash.replace(/_/g,"\t") + "\t";

			// # of samples
			output += data[hash][INC_KEY].length + "\t";

			// # of people represented by that sample
			output += data[hash].population + "\t";

			// weighted median
			var income = weightedMedian(data[hash][INC_KEY]);
			console.log(income);

			output += income + "\t";

			/*
			// inflation-adjusted weighted median
			var year = /[0-9]{4}/.exec(hash);
			if (year) {
				output += income * CPI2000[year[0]] * CPI2000_2014 + "\t";
			} else {
				output += "NA\t";
			}

			// quartiles
			var quartiles = weightedQuartile(data[hash].income, 20);
			output += quartiles.map(function(d) { return d.upper * CPI2000[year[0]] * CPI2000_2014; }).join("\t") + "\n";
			*/
			console.log(output);
		}

		fs.writeFileSync("data/medians_" + key + ".tsv", output);

		console.log(keyIndex, hash_keys.length);
		keyIndex += 1;
		if (keyIndex < hash_keys.length) {
			instream.close();
			calculateKey(keyIndex);
		} else {
			fs.writeFileSync("data/medians_all.tsv", output);
		}
	});
}