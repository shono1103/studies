import json
import sys
import time

from common.common import (
    TOPIC,
    build_client,
    connect_with_retry,
    encode_payload,
    wait_for_connection,
)


def main() -> None:
    client = build_client("publisher")
    connect_with_retry(client)
    client.loop_start()
    wait_for_connection(client)

    if sys.argv[1:]:
        raw = " ".join(sys.argv[1:])
        payload = json.loads(raw)
    else:
        payload = {
            "protocol": "Panasonic_AC",
            "signalState": ["0x23", "0x35"],
            "sentAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
    message = encode_payload(payload)
    info = client.publish(TOPIC, message)
    info.wait_for_publish()
    print(f"sent topic={TOPIC} payload={message}")

    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()
