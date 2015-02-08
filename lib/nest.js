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
		by_state = {},
		by_city = {},
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

			datum.RACE_ETHNICITY = datum.HISPAN_GROUP == "Yes"? "Hispanic" : datum.RACE_GROUP;

			hash_keys.forEach(function(hash_key) {
				var key = hash_key.map(function(d) { return d === "ALL" ? "ALL" : datum[d] }).join("_");
				add_datum_to_key(data, datum, key);

			    if (opts.states) {
			    	by_state[datum.STATEFIP] = by_state[datum.STATEFIP] || {};
					add_datum_to_key(by_state[datum.STATEFIP], datum, key);
			    }

			    if (opts.cities) {
			    	//var city = datum.METAREA !== "N/A"? datum.METAREA : datum.MET2013;
			    	var city = datum.CITY;
			    	by_city[city] = by_city[city] || {};
					add_datum_to_key(by_city[city], datum, key);
			    }

			});
		}
	});

	function add_datum_to_key(parent, datum, key) {
		// setup the default object if it doesn't exist
	    if (!parent[key]) {
	    	parent[key] = {
	    		props: {},
	    		count: 0,
	    		population: 0
	    	};

	    	opts.dependents.forEach(function(dependent) {
	    		parent[key].values = parent[key].values || {};
	    		parent[key].values[dependent] = {};
	    	});	    	

	    	hash_key.forEach(function(d, i) {
	    		if (d === "ALL") {
	    			parent[key].props[hash_keys[0][i]] = "ALL";
	    		} else {
		    		parent[key].props[d] = datum[d];
		    	}
	    	});
	    }

	    parent[key].count += 1;
	    parent[key].population += parseInt(datum.PERWT, 10);

		opts.dependents.forEach(function(dependent) {
    		parent[key].values[dependent][datum[dependent]] = parent[key].values[dependent][datum[dependent]] || { count: 0, population: 0 };
    		parent[key].values[dependent][datum[dependent]].count += 1;
    		parent[key].values[dependent][datum[dependent]].population += parseInt(datum.PERWT, 10);
    	});
	}

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

		// reduce
		var reduced = [];
		for (var key in data) {
			var datum = data[key];
			delete datum.values;
			datum.sample_size = 5;
			if (datum.count > 5) {
				reduced.push(datum);
			}
		}
		fs.writeFileSync("reduced.json", JSON.stringify(reduced, null, 2));
		fs.writeFileSync("reduced_0.json", JSON.stringify(reduced));

		if (opts.states) {
			console.log(Object.keys(by_state));
			Object.keys(by_state).forEach(function(st) {
				fs.writeFileSync("flat/states/" + st + ".json", JSON.stringify(by_state[st], null, 2));
			});
		}

		var city_index = {};

		if (opts.cities) {			
			Object.keys(by_city).forEach(function(city) {
				var city_data = by_city[city];
				city_data = Object.keys(city_data).map(function(d) { return city_data[d]; });

				if (opts.dependents.length) {
					var sample_size = Math.max.apply(null, city_data.map(function(d) { return Object.keys(d.values.YEAR).length; }));
					city_data.forEach(function(d) {
						delete d.values;
						d.sample_size = sample_size;
					});
					city_index[city] = sample_size;
				}
				fs.writeFileSync("flat/cities/" + city.replace(/\//g, "_") + ".json", JSON.stringify(city_data, null, 2));
			});

			if (opts.dependents.length) {
				fs.writeFileSync("cities.json", JSON.stringify(city_index));
			}
		}
	});
}