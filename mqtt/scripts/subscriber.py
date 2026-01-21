import paho.mqtt.client as mqtt

from common.common import TOPIC, build_client, connect_with_retry, decode_payload


def on_message(_client: mqtt.Client, _userdata, message: mqtt.MQTTMessage) -> None:
    payload = decode_payload(message.payload)
    protocol = payload.get("protocol")
    signal_state = payload.get("signalState")
    print(f"recv topic={message.topic} protocol={protocol} signalState={signal_state}")


def handle_connect(client: mqtt.Client, _userdata, _flags, rc: int) -> None:
    if rc != 0:
        return
    client.subscribe(TOPIC)
    print(f"subscribed to {TOPIC}")


def main() -> None:
    client = build_client("subscriber", on_connect=handle_connect)
    client.on_message = on_message

    connect_with_retry(client)
    client.loop_forever()


if __name__ == "__main__":
    main()
