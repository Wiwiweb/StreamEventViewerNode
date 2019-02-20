const axios = require('axios');
const globals = require('./globals');

axios.defaults.headers.common['Accept'] = 'application/vnd.twitchtv.v5+json';
axios.defaults.headers.common['Client-ID'] = globals.TWITCH_CLIENT_ID;

const TWITCH_CHANNEL_INFO = 'https://api.twitch.tv/helix/users?login=';
const TWITCH_WEBHOOKS_HUB = 'https://api.twitch.tv/helix/webhooks/hub';
const TWITCH_TOPIC_FOLLOWS = 'https://api.twitch.tv/helix/users/follows?first=1&to_id=';

function streamer(req, res) {
    let channelName = req.query.channel;
    let channelId = 0;

    axios.get(TWITCH_CHANNEL_INFO + channelName)
    .then(response => {
        if (response.data.length === 0) {
            return Promise.reject("Channel doesn't exist")
        } else {
            channelId = response.data[0].id;
            return channelId;
        }
    })
    .catch(handleError.bind(null, "Couldn't get channel info"))
    .then(channelId => {
        return axios.post(TWITCH_WEBHOOKS_HUB, {
            'hub.mode': 'subscribe',
            'hub.callback': `http://${globals.HOSTNAME}/webhook/follow/${channelName}`,
            'hub.topic': TWITCH_TOPIC_FOLLOWS + channelId,
            'hub.lease_seconds': 60 // TODO
        })
    })
    .catch(handleError.bind(null, "Couldn't subscribe to webhook"))
    .then(response => {
        console.log(`Webhook subscribed: ${TWITCH_TOPIC_FOLLOWS + channelId} (${response.statusText})`);
        res.render('streamer', {channelName: channelName});
    });

    function handleError(message, error) {
        res.render('error', {
            message: message,
            error: error
        });
        return Promise.reject(error);
    }
}

module.exports = streamer;
