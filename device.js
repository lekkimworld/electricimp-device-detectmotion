// IMPORTS
#require "LIS3DH.device.lib.nut:2.0.1"
#require "WS2812.class.nut:3.0.0"

// CONSTANTS
const DATA_PER_SECOND = 100;
const READ_ACCEL_DELAY = 0.5;
const ACCEL_THRESHOLD = 0.05;

// 'GLOBALS'
i2c <- hardware.i2c89;
spi <- null;
led <- null;
state <- false;
backend <- false;
motion <- true;

// Configure the I2C bus and the acceleromter connected to it
i2c.configure(CLOCK_SPEED_400_KHZ);
accelerometer <- LIS3DH(i2c, 0x32);
accelerometer.setDataRate(DATA_PER_SECOND);
accelerometer.setRange(2);

// Set up the SPI bus the RGB LED connects to
spi = hardware.spi257;
spi.configure(MSB_FIRST, 7500);
hardware.pin1.configure(DIGITAL_OUT, 1);

// Set up the RGB LED
led = WS2812(spi, 1);

function setBackend(state) {
    backend = state;
}
function setMotion(state) {
    motion = state;
}

function ledOff() {
  local color = [0,0,0];
  led.set(0, color).draw();
  state = false;
}

function ledOn() {
    if (state) return;
    state = true;
    local color = [0,0,255];
    led.set(0, color).draw();
    imp.wakeup(0.1, ledOff);
}

function readAccel() {
    accelerometer.getAccel(function(data) {
        local detectMotion = motion && (data.x < (-1 * ACCEL_THRESHOLD) || data.x > ACCEL_THRESHOLD);
        local detectNoMotion = !motion && (data.x > (-1 * ACCEL_THRESHOLD) && (data.x < ACCEL_THRESHOLD));
        if (detectMotion || detectNoMotion) {
            server.log(format("Acceleration (G): (%0.2f, %0.2f, %0.2f)", data.x, data.y, data.z));
            if (backend) {
                // log and turn on led
                ledOn();
                
                // message agent
                local accelData = {
                    "x": data.x,
                    "y": data.y,
                    "z": data.z
                }
                agent.send("accelerometer", accelData);
            }
            
        }
    });
    imp.wakeup(READ_ACCEL_DELAY, readAccel);
}

// listen for messages from agent
agent.on("set.backend", setBackend);
agent.on("set.motion", setMotion);

// read the accelerometer
readAccel();
