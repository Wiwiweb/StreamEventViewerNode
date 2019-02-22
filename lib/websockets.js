const streamer = require('./streamer');

module.exports = function(io) {

    io.on('connection', function(socket) {
        channelName = socket.handshake.query.channel.toLowerCase();
        console.log(`New socket ${socket.id} joined channel ${channelName}`);
        socket.join(channelName); // Join socket room for this channel

        socket.on('disconnect', function() {
            console.log(`Socket ${socket.id} left channel ${channelName}`);
            let remainingSockets = Object.keys(io.in(channelName).connected).length;
            if (remainingSockets === 0) {
                console.log(`Room empty, unsubscribing from channel webhook ${channelName}`);
                streamer.unsubscribeFromWebhook(channelName);
            }
        });
    });
};
