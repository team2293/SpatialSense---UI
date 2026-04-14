import Jetson.GPIO as GPIO
import boto3
import time
import json

# ===== AWS S3 SETTINGS =====
S3_BUCKET = "jetson-data-test-123"
COMMAND_FILE = "commands/start-scan.json"   # must match src/services/s3Service.js COMMANDS_PREFIX + filename
POLL_INTERVAL = 2  # seconds between S3 checks

# ===== PINS =====
PAN_PIN  = 32
TILT_PIN = 33

# ===== PWM SETTINGS =====
PWM_FREQ = 50

# ===== PAN SETTINGS =====
PAN_STOP_DUTY  = 7.5
PAN_SPEED      = 0.5
PAN_RIGHT_DUTY = PAN_STOP_DUTY + PAN_SPEED
PAN_LEFT_DUTY  = PAN_STOP_DUTY - PAN_SPEED

# ===== TILT SETTINGS =====
TILT_CENTER = 160
TILT_STEP   = 30

# ===== ROTATION TIME =====
ROTATION_TIME = 5.0   # CALIBRATE THIS — seconds for one full 360°

# ===== HELPER: angle to duty cycle =====
def angle_to_duty(angle):
    return 2.5 + (angle / 180.0) * 10.0

# ===== SETUP GPIO =====
def setup_gpio():
    GPIO.setmode(GPIO.BOARD)
    GPIO.setup(PAN_PIN,  GPIO.OUT)
    GPIO.setup(TILT_PIN, GPIO.OUT)

    pan_pwm  = GPIO.PWM(PAN_PIN,  PWM_FREQ)
    tilt_pwm = GPIO.PWM(TILT_PIN, PWM_FREQ)

    pan_pwm.start(PAN_STOP_DUTY)
    tilt_pwm.start(angle_to_duty(TILT_CENTER))
    time.sleep(1)

    return pan_pwm, tilt_pwm

# ===== RUN SCAN SEQUENCE =====
def run_scan(pan_pwm, tilt_pwm):
    print("Starting scan sequence...")

    # Step 1: Pan 360° right
    print("Step 1: Panning 360° right...")
    pan_pwm.ChangeDutyCycle(PAN_RIGHT_DUTY)
    time.sleep(ROTATION_TIME)
    pan_pwm.ChangeDutyCycle(PAN_STOP_DUTY)
    time.sleep(0.5)

    # Step 2: Pan 360° back left
    print("Step 2: Panning 360° back left...")
    pan_pwm.ChangeDutyCycle(PAN_LEFT_DUTY)
    time.sleep(ROTATION_TIME)
    pan_pwm.ChangeDutyCycle(PAN_STOP_DUTY)
    time.sleep(0.5)

    # Step 3: Tilt 30 degrees
    print("Step 3: Tilting 30 degrees...")
    tilt_target = TILT_CENTER - TILT_STEP
    tilt_pwm.ChangeDutyCycle(angle_to_duty(tilt_target))
    time.sleep(1)

    # Step 4: Pan 360° right (tilted)
    print("Step 4: Panning 360° right (tilted)...")
    pan_pwm.ChangeDutyCycle(PAN_RIGHT_DUTY)
    time.sleep(ROTATION_TIME)
    pan_pwm.ChangeDutyCycle(PAN_STOP_DUTY)
    time.sleep(0.5)

    # Step 5: Pan 360° back left (tilted)
    print("Step 5: Panning 360° back left (tilted)...")
    pan_pwm.ChangeDutyCycle(PAN_LEFT_DUTY)
    time.sleep(ROTATION_TIME)
    pan_pwm.ChangeDutyCycle(PAN_STOP_DUTY)
    time.sleep(0.5)

    # Return tilt to center
    print("Returning tilt to center...")
    tilt_pwm.ChangeDutyCycle(angle_to_duty(TILT_CENTER))
    time.sleep(1)

    print("Scan complete!")

# ===== CHECK S3 FOR COMMAND =====
# UI (src/services/s3Service.js) writes a JSON payload with a `timestamp` field
# each time the user clicks "New Scan". We treat a changed timestamp as a new
# command — the UI doesn't delete the file, so we can't rely on presence alone.
def check_for_command(s3_client):
    try:
        response = s3_client.get_object(
            Bucket=S3_BUCKET,
            Key=COMMAND_FILE
        )
        return json.loads(response['Body'].read().decode('utf-8'))
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"S3 error: {e}")
        return None

# ===== MAIN LOOP =====
def main():
    print("Initializing...")

    # Setup AWS
    s3_client = boto3.client(
        's3',
        region_name='us-east-1',        # change to your region
        aws_access_key_id='YOUR_KEY',    # or use IAM role on Jetson
        aws_secret_access_key='YOUR_SECRET'
    )

    # Setup GPIO
    pan_pwm, tilt_pwm = setup_gpio()

    # Seed last_timestamp with whatever's currently in S3 so a stale command
    # from a previous run doesn't fire on startup. Only commands written
    # AFTER the Jetson boots will trigger a scan.
    initial = check_for_command(s3_client)
    last_timestamp = initial.get("timestamp") if initial else None
    if last_timestamp:
        print(f"Ignoring existing command (timestamp={last_timestamp}) — waiting for next click")

    print(f"Polling S3 every {POLL_INTERVAL} seconds for scan command...")

    try:
        while True:
            command = check_for_command(s3_client)

            if command:
                ts = command.get("timestamp")
                if ts and ts != last_timestamp:
                    last_timestamp = ts
                    print(f"Scan command received (timestamp={ts})")
                    print(f"  scan details: {json.dumps(command)}")
                    run_scan(pan_pwm, tilt_pwm)
                    print("Waiting for next command...")

            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("Shutting down...")

    finally:
        pan_pwm.ChangeDutyCycle(PAN_STOP_DUTY)
        pan_pwm.stop()
        tilt_pwm.stop()
        GPIO.cleanup()
        print("Cleanup complete")

if __name__ == "__main__":
    main()