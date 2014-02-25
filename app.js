var connect = require('connect');
var http = require('http');
var path = require('path');
var url = require('url');
var mongo = require('mongodb');

var ipaddr  = process.env.OPENSHIFT_INTERNAL_IP || "127.0.0.1";
var port    = process.env.OPENSHIFT_INTERNAL_PORT || 8080;
var mongo_host = 'memorial02.cloudapp.net';
var mongo_port = mongo.Connection.DEFAULT_PORT || 27017;

//http.createServer(function (req, res) {}).listen(port, ipaddr);

var db = new mongo.Db('Podvig', new mongo.Server(mongo_host, mongo_port, {}), {safe:false});
db.open( function(err, db){
    console.log(err || " Connected to db!");
});

var app = connect();

app.use(connect.logger());
connect.logger({ immediate: true, format: 'dev' });
app.use(connect.json());
app.use(connect.urlencoded());
app.use(function(req, res) {
    var u = url.parse(req.url, true);
    if(u && u.query && u.query.collection){
        if(u.pathname == "/get"){
            getItems(u, req, res);
        } else if(u.pathname == "/update"){
            updateItems(u, req, res);
        } else if(u.pathname == "/delete"){
            deleteItems(u, req, res);
        } else if(u.pathname == "/add"){
            addItems(u, req, res);
        }
        return;
    }

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
});

function addItems(u, req, res) {
    var collection = u.query.collection;
    var items = u.query.items.split(",");
    db.collection(collection, function(err, coll) {
        coll.insert(items, {safe:true}, function(err, result) {
            if (err) {
                res.end({'error':'An error has occurred'});
            } else {
                console.log('Success: ' + JSON.stringify(result[0]));
                res.end(result[0]);
            }
        });
    })
}

function updateItems(u, req, res) {
    var collection = u.query.collection;
    var id = req.params.id;
    var item = req.body;
    console.log('Updating item: ' + id);
    console.log(JSON.stringify(item));
    db.collection(collection, function(err, collection) {
        collection.update({'_id':new BSON.ObjectID(id)}, item, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating item: ' + err);
                res.end({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.end(item);
            }
        });
    });
}

function getItems(u, req, res){
    var collection = u.query.collection;
    var items = u.query.items.split(",");
    var cursor = db.collection(collection).find( {_id:{ $in: items }}).toArray(function(err, items) {
        res.end(JSON.stringify(items));
        db.close();
    });
}

function deleteItems(u, req, res) {
    var collection = u.query.collection;
    var id = req.params.id;
    console.log('Deleting item: ' + id);
    db.collection(collection, function(err, collection) {
        collection.remove({'_id':new BSON.ObjectID(id)}, {safe:true}, function(err, result) {
            if (err) {
                res.end({'error':'An error has occurred - ' + err});
            } else {
                console.log('' + result + ' document(s) deleted');
                res.end(req.body);
            }
        });
    });
}

http.createServer(app).listen(port, ipaddr);
console.log("Server running at http://" + ipaddr + ":" + port + "/");