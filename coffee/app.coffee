connect = require("connect")
http = require("http")
path = require("path")
url = require("url")
mongo = require("mongodb")

options = {}
ipaddr = process.env.OPENSHIFT_INTERNAL_IP or "127.0.0.1"
port = process.env.OPENSHIFT_INTERNAL_PORT or 81
mongo_host = "localhost" or "memorial02.cloudapp.net"
mongo_port = mongo.Connection.DEFAULT_PORT or 27017
console.log "Server starting at http://" + ipaddr + ":" + port + "/"
console.log "Connecting to database..."

server = new mongo.Server(mongo_host, mongo_port,
  auto_reconnect: false
  socketOptions:
    keepAlive: 10
    connectTimeoutMS: 1000
    socketTimeoutMS: 0
)

connected = false
db = new mongo.Db("Podvig", server,
  safe: false
  w: 1
  wtimeout: 1000
  numberOfRetries: -1
  auto_reconnect: false
)

openDB = ->
    db.open (err, db) ->
        if err
            err = new Error(String(err))  unless err instanceof Error
            err.message = "Error connecting to database: " + err.message

            #throw err;
            return
        if options.username and options.password
            db.authenticate options.username, options.password, ->

        console.log " Connected to db!"
        connected = true

openDB()

db.on "close", (error) ->
  connected = false
  console.log "Connection to the database was closed!"
  openDB()

db.on "error", (err) ->
  console.log "Mongo...error", err

db.on "disconnect", (err) ->
  console.log "Mongo...disconnect", err

db.on "disconnected", (err) ->
  console.log "Mongo...disconnected", err

db.on "parseError", (err) ->
  console.log "Mongo...parse", err

db.on "timeout", (err) ->
  console.log "Mongo...timeout", err

app = connect()
app.use connect.logger()
connect.logger
  immediate: true
  format: "dev"

app.use connect.json()
app.use connect.urlencoded()
app.use (req, res) ->
  try
    throw new Error("Not connected to mongodb")  unless connected
    u = url.parse(req.url, true)
    if u and u.query and u.query.collection
      if u.pathname is "/get"
        getItems u, req, res
      else if u.pathname is "/update"
        updateItem u, req, res
      else if u.pathname is "/delete"
        deleteItems u, req, res
      else addItems u, req, res  if u.pathname is "/add"
      return
  catch ex
    console.log ex
    res.writeHead 200,
      "Content-Type": "text/plain"

    res.end "Database connection lost, try again later...\n"
    return
  res.writeHead 200,
    "Content-Type": "text/plain"

  res.end "Hello World\n"

addItems = (u, req, res) ->
    collection = u.query.collection
    items = u.query.items or req.body
    db.collection collection, (err, coll) ->
        coll.insert items,
            safe: true
        , (err, result) ->
            if err
                res.end "{'error':'An error has occurred" + err + "'}"
            else
                r = JSON.stringify(result)
                console.log "Success: " + r
                res.end r


updateItem = (u, req, res) ->
    collection = u.query.collection
    id = u.query.id
    item = req.body
    console.log "Updating item: " + id
    console.log JSON.stringify(item)
    db.collection collection, (err, collection) ->
        collection.update
            _id: new mongo.ObjectID(id)
        , item,
            safe: true
        , (err, result) ->
            if err
                console.log "Error updating item: " + err
                res.end "{'error':'An error has occurred'}"
            else
                console.log result + " document(s) updated"
                res.end JSON.stringify(item)


getItems = (u, req, res) ->
    collection = u.query.collection
    items = u.query.items.split(",")
    i = 0

    while i < items.length
        items[i] = mongo.ObjectID(items[i])
        i++
    db.collection collection, (err, coll) ->
        throw err  if err
        coll.find(_id:
            $in: items
        ).toArray (err, items) ->
            if err
                res.end "{'error':'An error has occurred - " + err + "'}"
                throw err
            else
                res.end JSON.stringify(items)


deleteItems = (u, req, res) ->
    collection = u.query.collection
    id = u.query.items or req.body
    id = [id]  unless Array.isArray(id)
    console.log "Deleting item(s): " + id
    i = 0

    while i < id.length
        id[i] = mongo.ObjectID(id[i])
        i++
    db.collection collection, (err, collection) ->
        collection.remove
            _id:
                $in: id
        ,
            safe: true
        , (err, result) ->
            if err
                res.end "{'error':'An error has occurred - " + err + "'}"
            else
                console.log result + " document(s) deleted"
                res.end "{\"deleted\":" + result + "}"

http.createServer(app).listen port, ipaddr