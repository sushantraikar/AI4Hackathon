var express = require("express");
var request = require("request");
var app = express();
var cfenv = require("cfenv");
var ConversationV1 = require('watson-developer-cloud/conversation/v1');
var bodyParser = require('body-parser')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
app.use(bodyParser.json())

var mydb;


var contexts = [];


/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'tuxedo_cat') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
  console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});


function sendMessage(event){
  var message = event.message.text;
  var number = event.sender.id;

  var context = null;
  var index = 0;
  var contextIndex = 0;
      contexts.forEach(function(value) {
        console.log(value.from);
        if (value.from == number) {
          context = value.context;
          contextIndex = index;
        }
        index = index + 1;
      });

    console.log('Recieved message from ' + number + ' saying \'' + message  + '\'');

    var conversation = new ConversationV1({
      username: '',
      password: '',
      version_date: ConversationV1.VERSION_DATE_2017_05_26
    });

    console.log(JSON.stringify(context));
    console.log(contexts.length);

  conversation.message({
    input: { text: message },
    workspace_id: 'c64ea171-ef58-4252-b790-1a1daf2cb96f',
    context: context
   }, function(err, response) {
       if (err) {
         console.error(err);
       } else {
         console.log(response.output.text[0]);
         if (context == null) {
           contexts.push({'from': number, 'context': response.context});
         } else {
           contexts[contextIndex].context = response.context;
         }

         var intent = response.intents[0].intent;
         console.log(intent);
         if (intent == "done") {
           //contexts.splice(contexts.indexOf({'from': number, 'context': response.context}),1);
           contexts.splice(contextIndex,1);
           // Call REST API here (order , etc.)
         }

         request({
                  url: 'https://graph.facebook.com/v2.6/me/messages',
                  qs: {access_token: ""},
                  method: 'POST',
                  json: {
                    recipient: {id: number},
                    message: {text: response.output.text[0]}
                  }
                }, function (error, response) {
                  if (error) {
                      console.log('Error sending message: ', error);
                  } else if (response.body.error) {
                      console.log('Error: ', response.body.error);
                  }
                });

    }
  });
}

app.get("/api/smssent", function (req, res) {
  var message = req.query.Body;
  var number = req.query.From;
  var twilioNumber = req.query.To;

  var context = null;
  var index = 0;
  var contextIndex = 0;
  contexts.forEach(function(value) {
    console.log(value.from);
    if (value.from == number) {
      context = value.context;
      contextIndex = index;
    }
    index = index + 1;
  });

  console.log('Recieved message from ' + number + ' saying \'' + message  + '\'');

  var conversation = new ConversationV1({
    username: '',
    password: '',
    version_date: ConversationV1.VERSION_DATE_2017_05_26
  });

  console.log(JSON.stringify(context));
  console.log(contexts.length);

  conversation.message({
    input: { text: message },
    workspace_id: '',
    context: context
   }, function(err, response) {
       if (err) {
         console.error(err);
       } else {
         console.log(response.output.text[0]);
         if (context == null) {
           contexts.push({'from': number, 'context': response.context});
         } else {
           contexts[contextIndex].context = response.context;
         }

         var intent = response.intents[0].intent;
         console.log(intent);
         if (intent == "done") {
           //contexts.splice(contexts.indexOf({'from': number, 'context': response.context}),1);
           contexts.splice(contextIndex,1);
           // Call REST API here (order , etc.)
         }

         var client = require('twilio')(
           '',
           ''
         );

         client.messages.create({
           from: twilioNumber,
           to: number,
           body: response.output.text[0]
         }, function(err, message) {
           if(err) {
             console.error(err.message);
           }
         });
       }
  });

  res.send('');
});






var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
