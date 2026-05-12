import requests

PROMETHEUS_URL = "http://prometheus:9090"


def get_cpu_usage():
    query = '100 - (avg by(instance)(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'

    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query}
    )

    return response.json()