// parse the codebook

module.exports = function(codebook) {
	var dictionary = [],
		definitions = {},
		recording = false,
		headers;

	// map character ranges to fields
	codebook.split("\n").forEach(function(line) {
		if (/^\s*Variable/.test(line)) {
			recording = !recording;
		}

		if (recording) {
			var fields = line.trim().split(/\s+(?:H|P)?\s+/);
			if (!headers) {
				headers = fields;
			} else {
				if (headers.length == fields.length) {
					var d = {};
					fields.forEach(function(field, f) { d[headers[f]] = field; });
					dictionary.push(d);
				}
			}
		}
	});

	dictionary.forEach(function(field) {
		field.Columns = field.Columns.split("-").map(function(d) { return parseInt(d,10); });	
		if (field.Columns.length === 1) {
			field.Columns.push(field.Columns[0]);
		}
	});

	// map field values to integers
	var field;
		

	codebook.split("All Years . - not available in this sample")[1].split("\n").forEach(function(line) {
		if (line == "") {
			return;
		}

		var vals = line.split(/\t+/);

		if (line[0] == " ") {
			field = vals[0].trim();
			definitions[field] = {
				description: vals[1]
			};
		} else {
			definitions[field][vals[0]] = vals[1];
		}
	});

	return {
		dictionary: dictionary,
		definitions: definitions
	}
}