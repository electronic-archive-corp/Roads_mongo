var connect = require('connect');
var http = require('http');
var path = require('path');
var url = require('url');
var mongo = require('mongodb');

var ipaddr  = process.env.OPENSHIFT_INTERNAL_IP || "127.0.0.1";
var port    = process.env.OPENSHIFT_INTERNAL_PORT || 8080;
var mongo_host = 'memorial02.cloudapp.net';
var mongo_port = mongo.Connection.DEFAULT_PORT || 27017;

console.log("Server starting at http://" + ipaddr + ":" + port + "/");
console.log("Connecting to database...");
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
            updateItem(u, req, res);
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
    var items = u.query.items || req.body;
    db.collection(collection, function(err, coll) {
        coll.insert(items, {safe:true}, function(err, result) {
            if (err) {
                res.end("{'error':'An error has occurred" + err + "'}");
            } else {
                var r =  JSON.stringify(result);
                console.log('Success: ' + r);
                res.end(r);
            }
        });
    })
}

function updateItem(u, req, res) {
    var collection = u.query.collection;
    var id = u.query.id;
    var item = req.body;
    console.log('Updating item: ' + id);
    console.log(JSON.stringify(item));
    db.collection(collection, function(err, collection) {
        collection.update({'_id':new mongo.ObjectID(id)}, item, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating item: ' + err);
                res.end("{'error':'An error has occurred'}");
            } else {
                console.log(result + ' document(s) updated');
                res.end(JSON.stringify(item));
            }
        });
    });
}

function getItems(u, req, res){
    var collection = u.query.collection;
    var items = u.query.items.split(",");
    for(var i = 0; i < items.length; i++){
        items[i] = mongo.ObjectID(items[i]);
    }
    var cursor = db.collection(collection).find( {_id:{ $in: items }}).toArray(function(err, items) {
        if (err) {
            res.end("{'error':'An error has occurred - " + err + "'}");
        } else {
            res.end(JSON.stringify(items));
        }
    });
}

function deleteItems(u, req, res) {
    var collection = u.query.collection;
    var id = u.query.items || req.body;
    if(!Array.isArray(id)){
        id = [id];
    }
    console.log('Deleting item(s): ' + id);
    for(var i = 0; i < id.length; i++){
        id[i] = mongo.ObjectID(id[i]);
    }
    db.collection(collection, function(err, collection) {
        collection.remove({_id:{ $in: id }}, {safe:true}, function(err, result) {
            if (err) {
                res.end("{'error':'An error has occurred - " + err + "'}");
            } else {
                console.log(result + ' document(s) deleted');
                res.end('{"deleted":' + result + '}');
            }
        });
    });
}

http.createServer(app).listen(port, ipaddr);