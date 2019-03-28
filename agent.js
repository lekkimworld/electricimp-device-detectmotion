// constants
const ENDPOINT = "https://mighty-meadow-26007.herokuapp.com"

// Log the URLs we need
server.log("Tell backend On: " + http.agenturl() + "?backend=1");
server.log("Tell backend Off (default): " + http.agenturl() + "?backend=0");
server.log("Detect Motion (default): " + http.agenturl() + "?motion=1");
server.log("Detect No-Motion: " + http.agenturl() + "?motion=0");
server.log("Query state: " + http.agenturl() + "?state=1");

// declarations
backend <- false;
motion <- true;

function requestHandler(request, response) {
    try {
        if ("motion" in request.query) {
            motion = request.query.motion == "1";
            device.send("set.motion", motion);
        } else if ("backend" in request.query) {
            backend = request.query.backend == "1";
            device.send("set.backend", backend);
        }
        
        // send state back
        response.send(200, "{\"motion\": " + (motion ? "true" : "false") + ", \"backend\": " + (backend ? true : false) + "}");
        
    } catch (ex) {
        response.send(500, "{\"status\": \"error\", \"error\": \"" + err + "\"}");
    }
}

function dataAccelerometer(data) {
    local message = format("Agent received data from accelerometer [x: %.2f | y: %.2f | z: %.2f]", data.x, data.y, data.z);
    server.log(message);
    if (!backend) return;
    
    // we should send data to backend
    local request = http.post(ENDPOINT, {"Content-Type": "application/json"}, http.jsonencode(data));
    local response = request.sendsync();
}

// Register the HTTP handler to begin watching for HTTP requests from your browser
http.onrequest(requestHandler);

// register handler for message from device
device.on("accelerometer", dataAccelerometer);