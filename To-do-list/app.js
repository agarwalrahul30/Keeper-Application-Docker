//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const dateModule = require(__dirname+"/date.js");
const os = require('os');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const dbUrl = process.env.DB_TODO_URL || "mongodb://localhost:27017/todo";

mongoose.connect(dbUrl, {useNewUrlParser: true});
var date = dateModule.getDate();

const taskSchema = new mongoose.Schema({
  name: String
});
const Task = mongoose.model("Task", taskSchema);


const listSchema = new mongoose.Schema({
  name: String,
  tasks: [taskSchema]
});
const List = mongoose.model("List", listSchema);

const sampleTask = new Task({
  name: "Buy Food"
});

const defaultTasks = [sampleTask];

app.get("/", function(req, res) {
  Task.find({}, function(err, result) {
    if(result.length === 0) {
      Task.insertMany(defaultTasks, function(err) {
        if(!err) {
          console.log("Successfully inserted 1 task in root route.");
        }
      });
      res.redirect("/");
    }else {
      res.render("list", {listTitle: date, newListItems: result});
      //to check load-balancing
      const hostname = os.hostname();
      console.log(`Request received on hostname: ${hostname}`);
    }
  });
});

app.get("/:customList", function(req, res) {
  let customList = _.capitalize(req.params.customList);

  List.findOne({name: customList}, function(err, found) {
    if(!err) {
      if(found) {
        res.render("list", {listTitle: found.name, newListItems: found.tasks});
      } else {
        const newCustomList = new List({
          name: customList,
          tasks: []
        });
        newCustomList.save();
  
        res.redirect("/"+customList);
      }
    }
    
  })

})

app.post("/", function(req, res){

  const item = req.body.newItem;
  const listName = req.body.addButton;

  const newItem = new Task({
    name: item
  });

  if(listName === date) {
    newItem.save();
    console.log("Successfully inserted task in root route.");
    res.redirect("/"); 
  }else {
    List.findOne({name: listName}, function(err, found) {
      if(err) {
        console.log(err);
      } else {
        found.tasks.push(newItem);
        found.save();
        console.log("Successfully inserted task in /"+listName+" route.");
        res.redirect("/"+listName);
      }
    });
    
  }
});

app.post("/delete", function(req, res){

  const deleteItemId = req.body.checkbox;
  const listName = req.body.listName;

  if(listName === date) {
    Task.findByIdAndRemove(deleteItemId, function(err) {
      if(err) {
        console.log(err);
      }else {
        console.log("Successfully removed one record from root route.");
        res.redirect("/");
      }
    });
  }else {
    List.findOneAndUpdate({name: listName}, {$pull: {tasks: {_id: deleteItemId}}}, function(err, found) {
      if(!err) {
        console.log("Successfully removed from /"+listName+" route.");
        res.redirect("/"+listName);
      }
    })
  }
  
});

app.listen(process.env.PORT || 8000, function() {
  console.log("Server started on port 8000");
});
