/*
accepts a .tsv file outputed by the csv script and groups the individual people according to a set of variables you provide
options:
	--vars: A comma-separated list of variable names (e.g. MARST,AGE,SEX) around which we'll group the data 	
	--combos: A flag to indicate whether there should also be an "ALL" option for each of the variables provided
*/

var fs = require("fs");
var readline = require("readline");
var combination = require('./combine');

module.exports = function(opts) {
	if (!opts.vars) {
		console.log("Please let me know which variables you want to group on using the --vars option.");
		return;
	}

	var hash_key = opts.vars.split(",");

	if (opts.combos) {
		hash_keys = combination(hash_key);
		hash_keys.push([]);

		// add ALL wherever necessary to fill out the combinations
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

	var data = {},
		line_count = 0;

	var instream = fs.createReadStream(opts._[1] + ".tsv", { encoding: 'utf8' });
	
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

			//datum.RACE_ETHNICITY = datum.HISPAN_GROUP == "Yes"? "Hispanic" : datum.RACE_GROUP;

			hash_keys.forEach(function(hash_key) {
				var key = hash_key.map(function(d) { return d === "ALL" ? "ALL" : datum[d] }).join("_");
				add_datum_by_key(data, datum, key, hash_key);
			});
		}
	});

	// for any given line, match it to a hash key and add to the appropriate place in the object
	function add_datum_by_key(parent, datum, key, hash_key) {
		// setup the default object if it doesn't exist
	    if (!parent[key]) {
	    	parent[key] = {
	    		props: {},
	    		count: 0,
	    		population: 0
	    	};

	    	hash_key.forEach(function(d, i) {
	    		if (d === "ALL") {
	    			parent[key].props[hash_keys[0][i]] = "ALL";
	    		} else {
		    		parent[key].props[d] = datum[d];
		    	}
	    	});
	    }

	    parent[key].count += 1;
	    if (typeof datum.PERWT != "undefined") {
		    parent[key].population += parseInt(datum.PERWT, 10)
		} else {
			parent[key].population += parseInt(datum.HHWT, 10);
		}
	}

	rl.on('close', function() {
		// don't need the hash keys in final output
		data = Object.keys(data).map(function(d) { return data[d]; });
		fs.writeFileSync(opts._[1] + "_grouped.json", JSON.stringify(data, null, 2));
		console.log("Wrote grouped JSON file to " + opts._[1] + "_grouped.json");

		// convert to csv
		var csv = "";
		var variables = opts.vars.split(",");
		header = variables.concat(["count", "population"]);
		csv += header.join("\t") + "\n";

		data.forEach(function(combo) {
			csv += variables.map(function(d) { return combo.props[d] }).join("\t") + "\t" + [combo.count, combo.population].join("\t") + "\n";
		});
		fs.writeFileSync(opts._[1] + "_grouped.tsv", csv);
		console.log("Wrote grouped TSV file to " + opts._[1] + "_grouped.tsv");

		if (opts.min_sample) {
			// reduce
			var min_sample = parseInt(opts.min_sample, 10);
			data = data.filter(function(datum) {
				return datum.count >= min_sample;
			});
			fs.writeFileSync(opts._[1] + "_reduced.json", JSON.stringify(data, null, 2));
			console.log("Wrote reduced file to " + opts._[1] + "_reduced.json");
		}
	});
}