const socket = io(window.location.href); // Use full URL to pass on the channel parameter
console.log('Connected to socket');

socket.on('connect', () => {
    console.log('Connected: ' + socket.id);
});

socket.on('new event', function(event) {
    console.log("New event: " + event);
    let eventList = document.getElementById('event-list');
    let newLI = document.createElement('li');
    newLI.appendChild(document.createTextNode(event));
    eventList.appendChild(newLI);
});
