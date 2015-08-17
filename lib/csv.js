var fs = require("fs");
var readline = require('readline');

var parseCodebook = require("./codebook");
var bucket_definitions = require("../buckets.json");
//bucket_definitions = {};

module.exports = function(opts) {
	var codebook = fs.readFileSync(opts._[1] + ".cbk", "utf8"),
		instream = fs.createReadStream(opts._[1] + ".dat", { encoding: 'utf8' }),
		outstream = fs.createWriteStream(opts._[1] + ".tsv");

	/****** PARSE THE CODEBOOK *******/

	var cb = parseCodebook(codebook);

	var fields = cb.dictionary.map(function(d) { return d.Variable; });

	var buckets = [];

	opts.bucket = opts.bucket || opts.buckets;

	// if we're going to bucketize any vars, let's make fields for them.
	if (opts.bucket) {
		opts.bucket.split(",").forEach(function(bucket_name) {
			if (bucket_definitions[bucket_name]) {
				var bucket = bucket_definitions[bucket_name];
				// we'll use this to cache lookups in memory
				bucket.lookup = {};
				bucket.name = bucket_name;
				buckets.push(bucket)

				// add a field for the bucketized value
				fields.push(bucket_name + "_group");
			} else {
				console.log("Couldn't find a bucket matching", bucket_name)
			}
		});
	}

	// fields to ignore in the output
	var eliminate = ["DATANUM","PERNUM"];
	if (!opts.keep_original) {
		eliminate = eliminate.concat(buckets.map(function(d) { return d.field; }));
	}
	if (opts.ignore) {
		eliminate = eliminate.concat(opts.ignore.split(","));		
	}

	fields = fields.filter(function(d) { return eliminate.indexOf(d) == -1; });

	if (opts.full_pumas) {
		if (!~fields.indexOf("PUMA") || !~fields.indexOf("STATEFIP")) {
			console.log("For the --full_pumas option to work, you need to have both 'PUMA' and 'STATEFIP' in your original data request. Ignoring.");
			delete opts.full_pumas;
		}
	}

	outstream.write(fields.join("\t") + "\n");

	// read file line by line

	var buffer = "",
		total = 0,
		start = new Date().getTime(), // let's time the operation
		datum;

	var rl = readline.createInterface({
	    input: instream,
		output: process.stdout,
	    terminal: false
	});

	// read each line from the original .dat file and match it up to codebook
	rl.on('line', function(line) { 
		datum = {};
		cb.dictionary.forEach(function(column) {
			// data from .dat file in relevant character ranges
			var valStr = line.slice(column.Columns[0]-1, column.Columns[1]);

			if (cb.definitions[column.Variable]) {
				// plain-language value of that variable, if found in codebook
				var	label = cb.definitions[column.Variable][valStr] || "N/A", 
					// convert to native integer or float if pattern matches
					val = /^[0-9]+$/.test(label) ? parseInt(label,10) : (/^[0-9]+\.[0-9]+$/.test(label) ? parseFloat(label) : label); 
			} else {
				var label = "",
					val = /^[0-9]+$/.test(valStr) ? parseInt(valStr,10) : (/^[0-9]+\.[0-9]+$/.test(valStr) ? parseFloat(valStr) : valStr); // convert to native integer or float if pattern matches
			}

			// some special cases to account for
			// PERWT has two implicit decimals
			if (column.Variable === "PERWT" || column.Variable === "HHWT") { 
				val /= 100;
			}

			// 99999999999 means not recorded (see INCTOT et al)
			/*
			if (column.Variable === "INCTOT" && /^99999/.test(valStr)) { 
				valStr = "";
				val = null;
			}
			*/	


			datum[column.Variable] = { val: val, label: label, valStr: valStr };
		});

		if (opts.full_pumas) {
			var full_puma = datum.STATEFIP.valStr + datum.PUMA.valStr;
			datum.PUMA = {
				val: full_puma,
				label: '', // we have these labels in pumas.json, but nowhere to currently put them in the output. (And would add hugely to filesize)
				valStr: full_puma
			};
		}

		buckets.forEach(function(bucket) {
			var field = bucket.field,
				valStr = datum[field].valStr;

			if (!bucket.lookup[valStr]) {
				var val = parseInt(valStr, 10),
					bucketed = false;

				for (var b in bucket.buckets) {				
					if (val >= bucket.buckets[b][0] && val <= bucket.buckets[b][1]) {
						bucket.lookup[valStr] = bucket.buckets[b][2];
						bucketed = true;
						break;
					}
				}
				if (!bucketed) {
					bucket.lookup[valStr] = val;
				}
			}
			datum[bucket.name + "_group"] = { val: bucket.lookup[valStr] };
		});

		buffer += fields.map(function(d) { return datum[d].val; }).join("\t") + "\n";
		total += 1;

		if (total % 1000 === 0) {
			process.stdout.write("Scanned " + total + " lines\r");
		}

		if (total % (opts.buffer || 10000) === 0) {
			outstream.write(buffer);
			buffer = "";
		}
	});

	rl.on("close", function() {

		outstream.write(buffer);

		var end = new Date().getTime(),
			delta = Math.round((end - start) / 1000);

		console.log("Finished parsing " + total + " lines in " + delta + " seconds.");
		console.log("Wrote output to " + opts._[1] + ".tsv");
	});
}