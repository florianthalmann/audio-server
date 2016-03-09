(function() {
	
	var fs = require('fs');
	var express = require('express');
	var wav = require('wav');
	
	var app = express();
	var PORT = 8060;
	
	var audioLocation = __dirname + '/ilmaudio/wav/';
	
	app.get('/getAudioChunk', function(request, response, next) {
		var filename = request.query.filename;
		var fromSecond = parseFloat(request.query.fromSecond);
		var toSecond = parseFloat(request.query.toSecond);
		if (filename && !isNaN(fromSecond) && !isNaN(toSecond)) {
			var filepath = audioLocation + filename;
			var writer = new wav.Writer();
			writer.pipe(response);
			pipeWavFile(filepath, fromSecond, toSecond, writer);
		}
	});
	
	function pipeWavFile(filepath, fromSecond, toSecond, writer) {
		var file = fs.createReadStream(filepath);
		var reader = new wav.Reader();
		
		var format, fromSample, toSample, totalSize;
		var numSamplesStreamed = 0;
		var numSamplesAccumulated = 0;
		var samples = []; // array that holds all the chunks
		
		reader.on('format', function (f) {
			format = f;
			var factor = f.sampleRate*f.channels*(f.bitDepth/8);
			fromSample = Math.round(fromSecond*factor);
			toSample = Math.round(toSecond*factor);
			totalSize = toSample-fromSample;
		});
		reader.on('data', function (chunk) {
			if (numSamplesAccumulated < totalSize) {
				var chunkSize = chunk.length;
				var start = fromSample-numSamplesStreamed;
				if (start < chunk.length) {
					if (0 < start) {
						chunk = chunk.slice(start);
					}
					var chunksToGo = totalSize-numSamplesAccumulated;
					if (chunksToGo < chunk.length) {
						chunk = chunk.slice(0, chunksToGo);
					}
					writer.write(chunk);
					numSamplesAccumulated += chunk.length;
				}
				numSamplesStreamed += chunkSize;
			}
		});
		reader.on('error', function() {
			writer.end();
		})
		reader.on('end', function() {
			writer.end();
		});
		file.pipe(reader);
	}
	
	app.listen(PORT, function() {
		console.log('Audio server started at http://localhost:' + PORT);
	});
	
}).call(this);
