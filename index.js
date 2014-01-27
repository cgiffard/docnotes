var fs = require("fs"),
	readdirp = require("readdirp"),
	esprima = require("esprima");

function processFile(path, scanMap, cb) {
	fs.readFile(path, function(err, data) {
		if (err) cb(err);

		try {
			var ast = esprima.parse(data, { comment: true });
		} catch(e) {
			ast = { comments: [] };
			e.message += " in file " + path;

			// return cb(e);
		}

		cb(
			null,
			(ast.comments || [])
				.map(function(comment) {
					for (var idx = 0, scanTerm;
						scanTerm = scanMap[idx], idx < scanMap.length; idx ++)
						if (comment.value &&
							comment.value.match(scanTerm.condition))
							return {
								value: comment.value,
								kind: scanTerm.kind
							};
				})
				// Weed out comments that weren't selected
				.filter(function(item) {
					return !!item;
				}));
	});
}

// Executes callback conditionally, if the exclusion evaluates to false.
// The exclusion can be a string, RegExp, or function.
function processExclusion(fileData, exclude, cb) {
	if (!fileData || !cb)
		throw new Error("File data and callback must be provided.");

	// If exclude is falsy, we just execute the callback
	if (!exclude)
		return cb(fileData);

	// Excute callback if regex matches
	if (typeof exclude === "string")
		return (
			~(fileData.fullPath || "")
				.indexOf(exclude) && cb(fileData));

	// Excute callback if regex matches
	if (exclude instanceof RegExp)
		return !exclude.exec(fileData.fullPath) && cb(fileData);

	// Execute callback if function returns true
	if (exclude instanceof Function)
		exclude(fileData, function(success) {
			if (success) cb(fileData);
		});
}

module.exports =
	function scanDirectory(directory, exclude, scanMap, cb) {
		var results = [];

		if (!directory)
			throw new Error("You must provide a directory to scan.");

		if (!scanMap || !(scanMap instanceof Array))
			throw new Error("You must provide a map of patterns to scan for.");

		if (!cb || !(cb instanceof Function))
			throw new Error("You must provide a callback function.");

		// Establish default exclusion
		if (exclude === undefined)
			exclude = /(node_modules|test|\.git)/i;

		readdirp({ root: directory, fileFilter: "*.js" })
			.on("data",function(data) {
				processExclusion(data, exclude, function(data) {
					processFile(
						data.fullPath,
						scanMap,
						function(err, fileResults) {
							if (err) throw err;

							if (fileResults.length)
								results.push({
									file: data.fullPath,
									comments: fileResults
								});
						}
					);
				})
			})
			.on("end", cb.bind(null, null, results));
	};