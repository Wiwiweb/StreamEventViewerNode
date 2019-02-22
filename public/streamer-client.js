let channelName = new URLSearchParams(document.location.search).get('channel');

let socket = io({query: {channel: channelName}}); // Pass the channel name from the URL parameter
console.log('Connected to socket');

socket.on('new-event', function(event) {
    console.log("New event: " + event);
    let eventList = document.getElementById('event-list');
    let newLI = document.createElement('li');
    newLI.appendChild(document.createTextNode(event));
    eventList.removeChild(eventList.lastChild);
    eventList.prepend(newLI);
});

document.addEventListener("DOMContentLoaded",function() {
    new Twitch.Embed("twitch-embed", {
        width: '100%',
        height: '100%',
        channel: channelName
    });
});
