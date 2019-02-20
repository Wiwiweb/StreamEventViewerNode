const axios = require('axios');
const globals = require('./globals');

axios.defaults.headers.common['Accept'] = 'application/vnd.twitchtv.v5+json';
axios.defaults.headers.common['Client-ID'] = globals.TWITCH_CLIENT_ID;

const TWITCH_CHANNEL_INFO = 'https://api.twitch.tv/helix/users?login=';
const TWITCH_WEBHOOKS_HUB = 'https://api.twitch.tv/helix/webhooks/hub';
const TWITCH_TOPIC_FOLLOWS = 'https://api.twitch.tv/helix/users/follows?first=1&to_id=';
const MAX_EVENTS_TO_DISPLAY = 10;

// Hash of channel name to array of last 10 events
let last_events = {};

function streamer(req, res) {
    let channelName = req.query.channel.toLowerCase();
    let channelId = 0;

    if (channelName in last_events) {
        // We already subscribed to this channel (e.g. someone is already watching it), just render
        res.render('streamer', {channelName: channelName});
    } else {

        // Get channel id from channel name
        axios.get(TWITCH_CHANNEL_INFO + channelName)
        .then(response => {
            if (response.data.data.length === 0) {
                return Promise.reject("Channel doesn't exist")
            } else {
                channelId = response.data.data[0].id;
                return channelId;
            }
        })
        .catch(handleError.bind(null, "Couldn't get channel info"))

        // Subscribe to followers webhook using channel id
        .then(channelId => {
            return axios.post(TWITCH_WEBHOOKS_HUB, {
                'hub.mode': 'subscribe',
                'hub.callback': `http://${globals.HOSTNAME}/webhook/follow/${channelName}`,
                'hub.topic': TWITCH_TOPIC_FOLLOWS + channelId,
                'hub.lease_seconds': 600
            })
        })
        .catch(handleError.bind(null, "Couldn't subscribe to webhook"))
        .then(response => {
            console.log(`Webhook subscribed: ${TWITCH_TOPIC_FOLLOWS + channelId} (${response.statusText})`);
            console.log(`New event list for ${channelName}`);
            last_events[channelName] = [];
            res.render('streamer', {channelName: channelName});
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

function addEvent(channelName, raw_event) {
    if (channelName in last_events) { // Just in case we somehow get a webhook new event without a subscription
        event = decodeFollowerEvent(raw_event);
        console.log(`New webhook event: ${event}`);
        last_events[channelName].unshift(event);
        if (last_events[channelName].length > MAX_EVENTS_TO_DISPLAY) {
            last_events[channelName].pop();
        }
        console.log(`last_events[${channelName}]: ${last_events[channelName]}`);
    } else {
        console.log('Webhook event without a subscription!');
    }
}

function decodeFollowerEvent(raw_event) {
    event_details = raw_event.data[0];
    return `${event_details.followed_at}: ${event_details.from_name} followed ${event_details.to_name}`
}

module.exports = streamer;
module.exports.addEvent = addEvent;
