from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import heapq
import math

app = FastAPI(title="RoadSense Adaptive Path Planner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

WIDTH = 20
HEIGHT = 12

SCENARIOS = {
    "Unsignalized Junction": {
        "obstacles": [(8,5),(8,6),(8,7),(12,7),(13,7),(14,7)],
        "potholes": [(5,8),(9,3),(15,6)],
        "vehicles": [(7,6),(10,5),(13,4)],
        "cattle": [(15,8)]
    },

    "Village Road": {
        "obstacles": [(6,6),(7,6),(12,5),(13,5)],
        "potholes": [(4,8),(8,6),(14,7)],
        "vehicles": [(9,5)],
        "cattle": [(7,4),(15,7)]
    },

    "Market Corridor": {
        "obstacles": [(5,4),(5,5),(10,7),(11,7),(12,7)],
        "potholes": [(7,8),(13,4)],
        "vehicles": [(6,6),(9,5),(14,6)],
        "cattle": [(13,7)]
    },

    "Highway Merge": {
        "obstacles": [(6,4),(6,5),(12,7),(13,7)],
        "potholes": [(4,8),(10,4)],
        "vehicles": [(8,5),(11,6)],
        "cattle": []
    }
}


def heuristic(a, b):
    return math.sqrt(
        (a[0] - b[0]) ** 2 +
        (a[1] - b[1]) ** 2
    )


def adaptive_astar(start, goal, scenario):

    data = SCENARIOS[scenario]

    obstacles = set(data["obstacles"])
    potholes = set(data["potholes"])

    dynamic_objects = (
        set(data["vehicles"]) |
        set(data["cattle"])
    )

    queue = []

    heapq.heappush(queue, (0, start))

    cost = {start: 0}
    parent = {start: None}

    directions = [
        (1,0), (-1,0),
        (0,1), (0,-1),
        (1,1), (1,-1),
        (-1,1), (-1,-1)
    ]

    while queue:

        _, current = heapq.heappop(queue)

        if current == goal:
            break

        for dx, dy in directions:

            nxt = (
                current[0] + dx,
                current[1] + dy
            )

            if not (
                0 <= nxt[0] < WIDTH and
                0 <= nxt[1] < HEIGHT
            ):
                continue

            if nxt in obstacles:
                continue

            movement_cost = 1.0

            # Pothole penalty
            if nxt in potholes:
                movement_cost += 5

            # Dynamic-object penalty
            if nxt in dynamic_objects:
                movement_cost += 8

            # Safety buffer around moving objects
            for obj in dynamic_objects:

                distance = math.sqrt(
                    (nxt[0] - obj[0]) ** 2 +
                    (nxt[1] - obj[1]) ** 2
                )

                if distance < 3:
                    movement_cost += (
                        3 - distance
                    ) * 2

            new_cost = (
                cost[current] +
                movement_cost
            )

            if (
                nxt not in cost or
                new_cost < cost[nxt]
            ):

                cost[nxt] = new_cost

                priority = (
                    new_cost +
                    heuristic(nxt, goal)
                )

                heapq.heappush(
                    queue,
                    (priority, nxt)
                )

                parent[nxt] = current

    if goal not in parent:
        return []

    path = []

    current = goal

    while current is not None:

        path.append(current)

        current = parent[current]

    path.reverse()

    return path


@app.get("/")
def home():

    return {
        "system": "RoadSense",
        "status": "ONLINE",
        "planner": "Adaptive A*"
    }


@app.get("/plan")
def generate_path(
    scenario: str = "Unsignalized Junction"
):

    if scenario not in SCENARIOS:
        scenario = "Unsignalized Junction"

    start = (1, 10)
    goal = (18, 2)

    path = adaptive_astar(
        start,
        goal,
        scenario
    )

    data = SCENARIOS[scenario]

    risk = 25

    if scenario == "Market Corridor":
        risk = 35

    if scenario == "Village Road":
        risk = 30

    if scenario == "Highway Merge":
        risk = 28

    return {

        "scenario": scenario,

        "path": [
            {
                "x": p[0],
                "y": p[1]
            }
            for p in path
        ],

        "obstacles": [
            {
                "x": x,
                "y": y
            }
            for x, y in data["obstacles"]
        ],

        "potholes": [
            {
                "x": x,
                "y": y
            }
            for x, y in data["potholes"]
        ],

        "vehicles": [
            {
                "x": x,
                "y": y
            }
            for x, y in data["vehicles"]
        ],

        "cattle": [
            {
                "x": x,
                "y": y
            }
            for x, y in data["cattle"]
        ],

        "metrics": {

            "path_score":
                round(100 - risk * 0.35, 1),

            "risk": risk,

            "traversability": 94,

            "smoothness": 91,

            "latency": 45,

            "speed": 32
        }
    }