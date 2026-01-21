import os
import time
import json
import threading
from typing import Callable, Optional

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv()

BROKER_HOST = os.getenv("MQTT_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC = os.getenv("MQTT_TOPIC", "study/demo")
CLIENT_ID_PREFIX = os.getenv("MQTT_CLIENT_ID_PREFIX", "mqtt-study")


def build_client(
    client_id_suffix: str,
    on_connect: Optional[
        Callable[[mqtt.Client, object, dict, int], None]
    ] = None,
) -> mqtt.Client:
    client_id = f"{CLIENT_ID_PREFIX}-{client_id_suffix}"
    client = mqtt.Client(client_id=client_id)
    client._connected_event = threading.Event()

    def _handle_connect(
        client: mqtt.Client, userdata: object, flags: dict, rc: int
    ) -> None:
        _default_on_connect(client, userdata, flags, rc)
        if on_connect is not None:
            on_connect(client, userdata, flags, rc)

    client.on_connect = _handle_connect
    return client


def _default_on_connect(client: mqtt.Client, _userdata, _flags, rc: int) -> None:
    event = getattr(client, "_connected_event", None)
    if event is not None:
        if rc == 0:
            event.set()
        else:
            event.clear()
    # rc == 0 means successful connection
    status = "ok" if rc == 0 else f"error({rc})"
    print(f"connected: {status}")


def connect_with_retry(client: mqtt.Client) -> None:
    while True:
        try:
            client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
            return
        except OSError as exc:
            print(f"connect failed: {exc}; retrying...")
            time.sleep(1)


def wait_for_connection(client: mqtt.Client, timeout: float = 5.0) -> None:
    event = getattr(client, "_connected_event", None)
    if event is None:
        return
    if not event.wait(timeout):
        raise TimeoutError("timed out waiting for MQTT connection")


def encode_payload(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=True, separators=(",", ":"))


def decode_payload(payload: bytes) -> dict:
    return json.loads(payload.decode("utf-8", errors="strict"))
