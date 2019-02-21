// Set sockets connections
module.exports = function(io) {
    io.on('connection', function(socket) {
        channelName = socket.handshake.query.channel.toLowerCase();
        console.log(`New socket ${socket.id} joined channel ${channelName}`);
        socket.join(channelName); // Join socket room for this channel

        socket.on('disconnect', function(socket){
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};
