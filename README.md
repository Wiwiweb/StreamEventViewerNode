# StreamEventViewerNode
Displays recent followers in real time using the Twitch API

Currently deployed on https://stream-event-viewer-william.herokuapp.com

## Behaviour
The app has two pages, the Home page and the Streamer page.

The Home page asks the user to log in with Twitch, using the Twitch OAuth2 authentication. After logged in, the Home page will ask the user to type in a Twitch channel name. This causes a couple things to happen:
* The app will go fetch the 10 most recent followers of the channel using the [relevant Twitch API](https://dev.twitch.tv/docs/api/reference/#get-users-follows)
* The app will subscribe to the [followers webhook subcription](https://dev.twitch.tv/docs/api/webhooks-reference/#topic-user-follows)
* The app will redirect the user to the Streamer page

The Streamer page (which cannot be accessed without being logged in), displays the embedded Twitch channel and chat, with the 10 most recent events of that channel.

If another user starts watching the same streamer, the app does not call the Twitch API again, and simply returns the list of events from memory.

When the backend receives a new follower event (through the webhook subscription), it will update the displayed recent events list of every user on the relevant Streamer page, using websockets.

If every user watching a channel closes their page, the app will unsubscribe to the webhook.

## Assumptions and decisions

Given that the only available topics on the Twitch webhooks related to channels are followers and stream state (online/offline), I decided to focus on followers since that is an event fired much more often. But it would not be complicated to integrate stream state events, and also future webhooks.

I at first assumed "leveraging web sockets and relevant Twitch API" meant the [websockets Twitch API](https://dev.twitch.tv/docs/pubsub/) but that seems to be reserved for the owners of a channel, so that wasn't an option.

The CSS and frontend are minimal.

## Technologies and Libraries used
* Node.js
* Express for routing
* passport for authentication
* axios for calling the Twitch API
* socket.io for websockets

## Quick code overview
`app.js` contains the actual server setup, including routes and authentication  
`lib/websockets.js` contains the "on connection" backend websocket logic and is called immediately on start by `app.js`  
`lib/home.js` contains the little bit of logic behind the Home page  
`lib/streamer.js` contains the logic of the Streamer page, which is most of the logic of the app

## Starting the app
Set the environment variables `PORT`, `HOSTNAME`, `TWITCH_CLIENT_ID`, and `TWITCH_CLIENT_SECRET`.  
Run `npm start`.

## Deploying on AWS and scaling considerations
The app uses an in-memory hash table of recent events lists. This is already pretty good since it avoids unnecessary calls to the Twitch API, but it means if 10000 channels are watched at once, this hash table will take up too much memory. It could be replaced with an ElastiCache data store like Redis.

The other bottlenecks would be handling the Twitch webhook responses (scales on number of channels) and handling the websocket connections to the users (scales on number of users). These can be solved by adding more EC2 servers behind an ELB load balancer. 

To help balance the load, separating the app into a backend (that handles webhooks) and a websockets app would allow putting resources where the app needs most. There would likely be more websocket servers than webhook servers since there are more viewers than channels. The webhook servers would populate a queue of websocket events to send, that would be consumed by the websocket servers, in a publisher/subscriber pattern. The Elasticache data store could be used for this queue.

All in all the architecture might look like this:

![Graph](https://i.imgur.com/2ziQ4yy.jpg)
