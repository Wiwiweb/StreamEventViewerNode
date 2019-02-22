const axios = require('axios');
const globals = require('./globals');

axios.defaults.headers.common['Accept'] = 'application/vnd.twitchtv.v5+json';
axios.defaults.headers.common['Client-ID'] = globals.TWITCH_CLIENT_ID;

const MAX_EVENTS_TO_DISPLAY = 10;
const TWITCH_CHANNEL_INFO = 'https://api.twitch.tv/helix/users?login=';
const TWITCH_CHANNEL_FOLLOWS = `https://api.twitch.tv/helix/users/follows?first=${MAX_EVENTS_TO_DISPLAY}&to_id=`;
const TWITCH_WEBHOOKS_HUB = 'https://api.twitch.tv/helix/webhooks/hub';
const TWITCH_WEBHOOKS_FOLLOWS = 'https://api.twitch.tv/helix/users/follows?first=1&to_id=';

// Hash of channel name to array of last 10 events
let lastEvents = {};

// Used when loading the streamer page
function streamer(req, res) {
    let channelName = req.query.channel.toLowerCase();
    let displayName = req.query.channel;
    let channelId = 0;

    if (channelName in lastEvents) {
        // We already subscribed to this channel (e.g. someone is already watching it), just render
        res.render('streamer', {channelName: displayName, lastEvents: lastEvents[channelName]});
    } else {

        // Get channel id from channel name
        getIdAndDisplayFromChannelName(channelName)
        .catch(handleError.bind(null, "Couldn't get channel info"))
        .then(results => {
            channelId = results[0];
            displayName = results[1];
            // Call followers API to pre-populate list of 10 latest events
            // Simultaneously subscribe to followers webhook using channel id
            return Promise.all([getRecentFollows(channelId), updateWebhookSubscription(channelId, channelName, 'subscribe')]);
        })
        .catch(handleError.bind(null, "Couldn't subscribe to webhook"))
        .then(results => {
            let recentFollowsEvents = results[0].data.data;
            let webhookResponse = results[1];
            console.log(`Webhook subscribed for channel ${channelName} (id: ${channelId}) (${webhookResponse.statusText})`);
            lastEvents[channelName] = recentFollowsEvents.map(rawEvent => decodeFollowerEvent(rawEvent));

            // Render the streamer page with the 10 recent followers from the followers API
            res.render('streamer', {channelName: displayName, lastEvents: lastEvents[channelName]});
        });
    }

    function handleError(message, error) {
        res.render('error', {
            message: message,
            error: error
        });
        return Promise.reject(error);
    }
}

// Used when everybody leaves the page, triggered in websockets.js
function unsubscribeFromWebhook(channelName) {
    getIdAndDisplayFromChannelName(channelName)
    .then(results => {
        let channelId = results[0];
        updateWebhookSubscription(channelId, channelName, 'unsubscribe');
        delete lastEvents[channelName]
    });
}

function getIdAndDisplayFromChannelName(channelName) {
    return axios.get(TWITCH_CHANNEL_INFO + channelName)
    .then(response => {
        if (response.data.data.length === 0) {
            return Promise.reject("Channel doesn't exist")
        } else {
            channelId = response.data.data[0].id;
            displayName = response.data.data[0].display_name;
            return [channelId, displayName]
        }
    });
}

function getRecentFollows(channelId) {
    return axios.get(TWITCH_CHANNEL_FOLLOWS + channelId)
}

function updateWebhookSubscription(channelId, channelName, mode) {
    return axios.post(TWITCH_WEBHOOKS_HUB, {
        'hub.mode': mode, // 'subscribe' or 'unsubscribe'
        'hub.callback': `http://${globals.HOSTNAME}/webhook/follow/${channelName}`,
        'hub.topic': TWITCH_WEBHOOKS_FOLLOWS + channelId,
        'hub.lease_seconds': 3600
    })
}

function addEvent(channelName, raw_event, io) {
    if (channelName in lastEvents) { // Just in case we somehow get a webhook new event without a subscription
        event = decodeFollowerEvent(raw_event.data[0]);
        console.log(`New webhook event: ${event}`);

        // Update lastEvents
        lastEvents[channelName].unshift(event);
        if (lastEvents[channelName].length > MAX_EVENTS_TO_DISPLAY) {
            lastEvents[channelName].pop();
        }

        // Update client event list through websockets
        io.to(channelName).emit('new-event', event);
    } else {
        console.log('Webhook event without a subscription!');
    }
}

function decodeFollowerEvent(rawEvent) {
    rawDate = rawEvent.followed_at;
    displayDate = rawDate.substr(0, 10) + ' ' + rawDate.substr(11, 8);
    return `${displayDate}: ${rawEvent.from_name} followed ${rawEvent.to_name}`
}

module.exports = streamer;
module.exports.addEvent = addEvent;
module.exports.unsubscribeFromWebhook = unsubscribeFromWebhook;
