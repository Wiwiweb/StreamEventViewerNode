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
        .catch(handleError.bind(null, "Couldn't get channel info"))
        .then(response => {
            if (response.data.data.length === 0) {
                return Promise.reject("Channel doesn't exist")
            } else {
                channelId = response.data.data[0].id;
                // Call followers API to pre-populate list of 10 latest events
                // Simultaneously subscribe to followers webhook using channel id
                return Promise.all([getRecentFollows(channelId), subscribeToWebhook(channelId)]);
            }
        })
        .catch(handleError.bind(null, "Couldn't subscribe to webhook"))
        .then(results => {
            recentFollowsEvents = results[0].data.data;
            webhookResponse = results[1];
            console.log(`Webhook subscribed: ${TWITCH_WEBHOOKS_FOLLOWS + channelId} (${webhookResponse.statusText})`);
            console.log(`New event list for ${channelName}`);
            last_events[channelName] = recentFollowsEvents.map(raw_event => decodeFollowerEvent(raw_event));
            res.render('streamer', {channelName: channelName});
        });
    }

    function getRecentFollows(channelId) {
        return axios.get(TWITCH_CHANNEL_FOLLOWS + channelId)
    }

    function subscribeToWebhook(channelId) {
        return axios.post(TWITCH_WEBHOOKS_HUB, {
            'hub.mode': 'subscribe',
            'hub.callback': `http://${globals.HOSTNAME}/webhook/follow/${channelName}`,
            'hub.topic': TWITCH_WEBHOOKS_FOLLOWS + channelId,
            'hub.lease_seconds': 20
        })
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
        event = decodeFollowerEvent(raw_event.data[0]);
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
    return `${raw_event.followed_at}: ${raw_event.from_name} followed ${raw_event.to_name}`
}

module.exports = streamer;
module.exports.addEvent = addEvent;
