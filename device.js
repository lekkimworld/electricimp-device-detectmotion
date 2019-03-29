// IMPORTS
#require "LIS3DH.device.lib.nut:2.0.1"
#require "WS2812.class.nut:3.0.0"

// CONSTANTS
const ACCEL_THRESHOLD = 0.01;
const RANGE = 16;
const ACTIVITY_SAMPLE_DELAY = 0.2;
const ACTIVITY_PERIOD_SECONDS = 3;
const SAMPLES_ALLOW_OPPOSITE = 10;

// 'GLOBALS'
i2c <- hardware.i2c89;
spi <- null;
led <- null;
state <- false;
backend <- false;
motion <- true; // true means detect movement and false means detect no-movement
samplesMotion <- 0;
samplesNoMotion <- 0;
firstMotionDetection <- motion;
firstNoMotionDetection <- !motion;

// Configure the I2C bus and the acceleromter connected to it
i2c.configure(CLOCK_SPEED_400_KHZ);
accelerometer <- LIS3DH(i2c, 0x32);
accelerometer.setDataRate(100);
accelerometer.setRange(RANGE);

// Set up the SPI bus the RGB LED connects to
spi = hardware.spi257;
spi.configure(MSB_FIRST, 7500);
hardware.pin1.configure(DIGITAL_OUT, 1);
led = WS2812(spi, 1);

function setBackend(state) {
    backend = state;
    ledOn([0,255,0]);
}
function setMotion(state) {
    motion = state;
    ledOn([0,0,255]);
}

function ledOff() {
  local color = [0,0,0];
  led.set(0, color).draw();
  state = false;
}

function ledOn(color = [0,0,255]) {
    if (state) return;
    state = true;
    led.set(0, color).draw();
    imp.wakeup(0.1, ledOff);
}

function checkIfFirstDetection(detectMotion, detectNoMotion, data) {
    local sendToBackend = false;
    if (detectMotion && firstMotionDetection) {
        server.log("This was first motion detected after NO motion");
        firstMotionDetection = false;
        firstNoMotionDetection = true;
        sendToBackend = true;
    }
    if (detectNoMotion && firstNoMotionDetection) {
        server.log("This was first NO motion detected after motion");
        firstMotionDetection = true;
        firstNoMotionDetection = false;
        sendToBackend = true;
    }
    
    // abort if we should not send to backend
    if (!sendToBackend || !backend) return;
    
    // log and turn on led
    server.log("Backend communication is enabled - flash LED and send to agent");
    ledOn([255,0,0]);
    
    // message agent
    local accelData = {
        "movement": detectMotion,
        "x": data.x,
        "y": data.y,
        "z": data.z
    }
    agent.send("accelerometer", accelData);
}

function readAccel() {
    accelerometer.getAccel(function(data) {
        //server.log(format("Acceleration (G): (%0.2f, %0.2f, %0.2f)", data.x, data.y, data.z));
        local detectMotion = (data.x < (-1 * ACCEL_THRESHOLD) || data.x > ACCEL_THRESHOLD);
        local detectNoMotion = (data.x > (-1 * ACCEL_THRESHOLD) && (data.x < ACCEL_THRESHOLD));
        local samplesForActivity = ACTIVITY_PERIOD_SECONDS / ACTIVITY_SAMPLE_DELAY;
        
        
        if (detectMotion) {
            samplesMotion++;
            if (samplesMotion > SAMPLES_ALLOW_OPPOSITE) samplesNoMotion = 0;
        }
        if (detectNoMotion) {
            samplesNoMotion++;
            if (samplesNoMotion > SAMPLES_ALLOW_OPPOSITE) samplesMotion = 0;
        }
        if (samplesMotion >= samplesForActivity) {
            server.log(format("We had motion for %i seconds", ACTIVITY_PERIOD_SECONDS));
            samplesMotion = 0;
            
            // check if first detection
            checkIfFirstDetection(detectMotion, detectNoMotion, data);
        }
        if (samplesNoMotion >= samplesForActivity) {
            server.log(format("We had NO motion for %i seconds", ACTIVITY_PERIOD_SECONDS));
            samplesNoMotion = 0;
            
            // check if first detection
            checkIfFirstDetection(detectMotion, detectNoMotion, data);
        }
        
        
    });
    imp.wakeup(ACTIVITY_SAMPLE_DELAY, readAccel);
}

// listen for messages from agent
agent.on("set.backend", setBackend);
agent.on("set.motion", setMotion);

// read the accelerometer
readAccel();
