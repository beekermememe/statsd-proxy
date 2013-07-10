var STATSD_HOST = 'int-radish01-statsd02.dishonline.com';
var STATSD_PORT = 8125;

var SERVE_HOST = '127.0.0.1'
var SERVE_PORT = 8082

var http = require('http'),fs = require('fs'),qs = require('querystring');
var url = require('url');
sdc = require('statsd-client'),
SDC = new sdc({
    host: STATSD_HOST, port: STATSD_PORT});

function dt(){
    d = new Date();
    return [d.getFullYear(),
            d.getMonth() + 1,
            d.getDate()].join('-') + ' ' + [
		d.getHours(),
		d.getMinutes()].join(':');
}

console.log(dt() + ' statsd-proxy starting; statsd is ' + STATSD_HOST + ':' + STATSD_PORT + '...');

http.createServer(function (req, res) {

    console.log("headers " + req.headers);
    console.log("method " + req.method);
    console.log("url " + req.url);
    console.log("BR " + req.socket.bytesRead);

    if(req.method === 'OPTIONS'){
		console.log('options!!!');
		 var headers = {};
		// IE8 does not allow domains to be specified, just the *
		// headers["Access-Control-Allow-Origin"] = req.headers.origin;
		headers["Access-Control-Allow-Origin"] = "*";
		headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
		headers["Access-Control-Allow-Credentials"] = false;
		headers["Access-Control-Max-Age"] = '86400'; // 24 hours
		headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
		res.writeHead(200, headers);
		res.end();
	}

    var body_data = '';

    req.on('data', function(chunk) {
  	  console.log("Got data post body " + chunk);
	  body_data += chunk;
    });

    var end = function () {
	  res.setHeader("Content-Type", "application/json");
	  res.end();
    };
    req.on('end', function(){
        var data = {}
        if(body_data !== null) {
          try {
		    data = JSON.parse(body_data);
	      }
	      catch(e) {
	        var uri_data = url.parse(req.url,true).query;
		    data = uri_data;	      	
	      }
		} else {
	      var uri_data = url.parse(req.url,true).query;
		  data = uri_data;
		}

		if (data.stat_path === undefined || data.stat_type === undefined || data.stat_value === undefined) {
			console.info("Undefined data points : " + data.stat_path + " : " + + data.stat_type + ":" + data.stat_value + "|" + body_data);
		    return end();
		}

		console.info(dt() + ' statsd-proxy: ' + data.stat_path + ':' +
			     data.stat_type + '|' + data.stat_value + ' (' + req.connection.remoteAddress + ')');

		switch (data.stat_type) {
		case 'count':
	            SDC.increment(data.stat_path, data.stat_value);
	            break;
		case 'timer':
	            SDC.timing(data.stat_path, data.stat_value);
	            break;
		case 'gauge':
	            SDC.gauge(data.stat_path, data.stat_value);
	            break;
		}
		SDC.increment('statsd-proxy.requests');
		end();
    });


}).listen(SERVE_PORT, SERVE_HOST);
