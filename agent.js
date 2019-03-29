// constants
const ENDPOINT = "https://mighty-meadow-26007.herokuapp.com/api/data"
const BEARER_TOKEN = "<secret>";

// Log the URLs we need
server.log("Tell backend On: " + http.agenturl() + "?backend=1");
server.log("Tell backend Off (default): " + http.agenturl() + "?backend=0");
server.log("Detect Motion (default): " + http.agenturl() + "?motion=1");
server.log("Detect No-Motion: " + http.agenturl() + "?motion=0");
server.log("Query state: " + http.agenturl() + "?state=1");

// declarations
backend <- true;
motion <- true;
device.send("set.motion", motion);
device.send("set.backend", backend);

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
        response.send(200, http.jsonencode({"motion": motion, "backend": backend}));
        
    } catch (ex) {
        response.send(500, http.jsonencode({"status": "error", "error": err}));
    }
}

function dataAccelerometer(data) {
    local movement = data.movement ? "true" : "false";
    local message = format("Agent received data from accelerometer [x: %.2f | y: %.2f | z: %.2f | movement: %s]", data.x, data.y, data.z, movement);
    server.log(message);
    if (!backend) return;
    
    // we should send data to backend
    local payload = {
        "type": "motion",
        "movement": data.movement,
        "x": data.x, 
        "y": data.y,
        "z": data.z
    }
    local headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + BEARER_TOKEN
    }
    local request = http.post(ENDPOINT, headers, http.jsonencode(payload));
    local response = request.sendsync();
}

// Register the HTTP handler to begin watching for HTTP requests from your browser
http.onrequest(requestHandler);

// register handler for message from device
device.on("accelerometer", dataAccelerometer);