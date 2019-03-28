// Log the URLs we need
server.log("Turn Cases On: " + http.agenturl() + "?cases=1");
server.log("Turn Cases Off: " + http.agenturl() + "?cases=0");

function requestHandler(request, response) {
  try {
    // Check if the user sent led as a query parameter
    if ("cases" in request.query) {
      // If they did, and led = 1 or 0, set our variable to 1
      if (request.query.cases == "1" || request.query.cases == "0") {
        // Convert the led query parameter to a Boolean
        local casesState = (request.query.cases == "0") ? false : true;

        // Send "set.led" message to device, and send ledState as the data
        device.send("set.cases", casesState); 
      }
    }
    
    // Send a response back to the browser saying everything was OK.
    response.send(200, "OK");
  } catch (ex) {
    response.send(500, "Internal Server Error: " + ex);
  }
}

function dataAccelerometer(data) {
  local message = format("Data from my Explorer Kit! [x: %.2f | y: %.2f | z: %.2f]", data.x, data.y, data.z);
  server.log(message);
}

// Register the HTTP handler to begin watching for HTTP requests from your browser
http.onrequest(requestHandler);

// register handler for message from device
device.on("accelerometer", dataAccelerometer);
