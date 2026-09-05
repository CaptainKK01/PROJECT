/* =========================================================
   ROAD SENSE
   ADAPTIVE PATH PLANNING SIMULATOR
   SIH 2026 — THE HORIZON

   Stable simulation architecture:
   - Global trajectory
   - Predictive obstacle detection
   - Side-crossing conflict prediction
   - Speed adaptation
   - Temporary local avoidance
   - Smooth trajectory recovery
   - Kinematic bicycle-inspired steering
   - Collision safety
   - Live telemetry
   - Premium visual effects
========================================================= */


/* =========================================================
   WORLD
========================================================= */

const WORLD = {

    width: 900,
    height: 550,

    roadLeft: 70,
    roadRight: 830,

    roadTop: 70,
    roadBottom: 480,

    centerX: 450,
    centerY: 275
};


/* =========================================================
   SIMULATION CONSTANTS
========================================================= */

const SIM_SCALE = 0.62;

const MAX_SPEED = 115;

const MAX_ACCEL = 26;

const MAX_BRAKE = 55;

const MAX_STEER_RATE = 1.7;

const VEHICLE_RADIUS = 17;

const SAFETY_MARGIN = 28;

const GOAL_RADIUS = 30;


/* =========================================================
   UTILITIES
========================================================= */

function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(max, value)
    );
}


function lerp(a, b, t) {

    return a + (b - a) * t;
}


function distance(x1, y1, x2, y2) {

    return Math.hypot(
        x2 - x1,
        y2 - y1
    );
}


function angleDifference(a, b) {

    let d = a - b;

    while (d > Math.PI) {
        d -= Math.PI * 2;
    }

    while (d < -Math.PI) {
        d += Math.PI * 2;
    }

    return d;
}


function normalizeAngle(angle) {

    while (angle > Math.PI) {
        angle -= Math.PI * 2;
    }

    while (angle < -Math.PI) {
        angle += Math.PI * 2;
    }

    return angle;
}


/* =========================================================
   SIMULATION STATE
========================================================= */

const sim = {

    elapsed: 0,

    scenario: "junction",

    running: true,

    completed: false,

    progress: 0,

    behavior: "CRUISE",

    previousBehavior: "CRUISE",

    eventText: "SYSTEM MONITORING ROAD",

    lastEvent: 0,

    replanCount: 0,

    criticalObstacle: null,

    avoidance: {

        active: false,

        side: 0,

        offset: 0,

        targetOffset: 0,

        timer: 0,

        cooldown: 0

    },

    metrics: {

        score: 96,

        risk: 8,

        travel: 0,

        smoothness: 97,

        speed: 48,

        steering: 0,

        acceleration: 0,

        lateralError: 0,

        ttc: 99,

        braking: 0,

        latency: 18,

        objects: 0,

        pedestrians: 0,

        vehicles: 0,

        obstacles: 0

    },

    vehicle: {

        x: 120,

        y: 275,

        angle: 0,

        speed: 50,

        steering: 0,

        acceleration: 0,

        width: 34,

        height: 18,

        distanceTravelled: 0

    },

    goal: {

        x: 780,

        y: 275

    },

    globalPath: [],

    localPath: [],

    traffic: [],

    pedestrians: [],

    animals: [],

    potholes: [],

    shops: [],

    houses: [],

    vendors: [],

    particles: [],

    scanPoints: [],

    decisionLog: []

};


/* =========================================================
   CANVAS
========================================================= */

const canvas =
    document.getElementById("mapCanvas");

const ctx =
    canvas
        ? canvas.getContext("2d")
        : null;


/* =========================================================
   SCENARIOS
========================================================= */

const scenarios = {

    junction: {

        name: "Unsignalized Junction",

        start: {
            x: 120,
            y: 275
        },

        goal: {
            x: 780,
            y: 275
        },

        traffic: [

            {
                x: 430,
                y: 160,
                angle: Math.PI / 2,
                speed: 35,
                type: "CAR"
            },

            {
                x: 610,
                y: 390,
                angle: -Math.PI / 2,
                speed: 29,
                type: "AUTO"
            },

            {
                x: 350,
                y: 120,
                angle: Math.PI / 2,
                speed: 25,
                type: "BIKE"
            }

        ],

        pedestrians: [

            {
                x: 480,
                y: 250,
                vx: 0,
                vy: 18
            },

            {
                x: 560,
                y: 300,
                vx: 0,
                vy: -14
            }

        ],

        animals: [

            {
                x: 650,
                y: 235,
                vx: 8,
                vy: 0,
                type: "COW"
            }

        ],

        potholes: [

            {
                x: 290,
                y: 315,
                radius: 15
            },

            {
                x: 690,
                y: 245,
                radius: 13
            }

        ]

    },


    village: {

        name: "Village Road",

        start: {
            x: 100,
            y: 310
        },

        goal: {
            x: 800,
            y: 250
        },

        traffic: [

            {
                x: 380,
                y: 275,
                angle: 0,
                speed: 30,
                type: "TRACTOR"
            },

            {
                x: 570,
                y: 250,
                angle: 0,
                speed: 38,
                type: "BIKE"
            }

        ],

        pedestrians: [

            {
                x: 470,
                y: 215,
                vx: 4,
                vy: 0
            }

        ],

        animals: [

            {
                x: 520,
                y: 320,
                vx: -8,
                vy: 0,
                type: "COW"
            }

        ],

        potholes: [

            {
                x: 260,
                y: 330,
                radius: 17
            },

            {
                x: 620,
                y: 280,
                radius: 15
            }

        ]

    },


    market: {

        name: "Market Corridor",

        start: {
            x: 100,
            y: 285
        },

        goal: {
            x: 800,
            y: 290
        },

        traffic: [

            {
                x: 300,
                y: 235,
                angle: 0,
                speed: 25,
                type: "AUTO"
            },

            {
                x: 460,
                y: 330,
                angle: Math.PI,
                speed: 22,
                type: "CAR"
            },

            {
                x: 650,
                y: 245,
                angle: 0,
                speed: 30,
                type: "BIKE"
            }

        ],

        pedestrians: [

            {
                x: 390,
                y: 205,
                vx: 0,
                vy: 18
            },

            {
                x: 590,
                y: 360,
                vx: 0,
                vy: -16
            },

            {
                x: 720,
                y: 220,
                vx: 0,
                vy: 12
            }

        ],

        animals: [

            {
                x: 530,
                y: 310,
                vx: 10,
                vy: 0,
                type: "DOG"
            }

        ],

        potholes: [

            {
                x: 230,
                y: 330,
                radius: 12
            },

            {
                x: 580,
                y: 265,
                radius: 13
            }

        ]

    },


    highway: {

        name: "Highway Merge",

        start: {
            x: 100,
            y: 250
        },

        goal: {
            x: 800,
            y: 250
        },

        traffic: [

            {
                x: 300,
                y: 215,
                angle: 0,
                speed: 62,
                type: "CAR"
            },

            {
                x: 470,
                y: 290,
                angle: 0,
                speed: 47,
                type: "TRUCK"
            },

            {
                x: 680,
                y: 225,
                angle: 0,
                speed: 55,
                type: "CAR"
            }

        ],

        pedestrians: [],

        animals: [],

        potholes: []

    }

};


/* =========================================================
   EVENT SYSTEM
========================================================= */

function pushEvent(message) {

    sim.eventText = message;

    sim.lastEvent = sim.elapsed;

    sim.decisionLog.unshift({

        time: sim.elapsed,

        text: message

    });

    if (sim.decisionLog.length > 12) {

        sim.decisionLog.pop();

    }

    const decision =
        document.getElementById("decision");

    if (decision) {

        decision.textContent =
            message;

    }

}


/* =========================================================
   SCENARIO LOADER
========================================================= */

function loadScenario(name) {

    const scenario =
        scenarios[name] ||
        scenarios.junction;

    sim.scenario = name;

    sim.completed = false;

    sim.elapsed = 0;

    sim.progress = 0;

    sim.replanCount = 0;

    sim.behavior = "CRUISE";

    sim.previousBehavior = "CRUISE";

    sim.avoidance.active = false;

    sim.avoidance.offset = 0;

    sim.avoidance.targetOffset = 0;

    sim.vehicle = {

        x: scenario.start.x,

        y: scenario.start.y,

        angle: Math.atan2(
            scenario.goal.y -
            scenario.start.y,

            scenario.goal.x -
            scenario.start.x
        ),

        speed: 45,

        steering: 0,

        acceleration: 0,

        width: 34,

        height: 18,

        distanceTravelled: 0

    };

    sim.goal = {

        x: scenario.goal.x,

        y: scenario.goal.y

    };

    sim.traffic =
        JSON.parse(
            JSON.stringify(
                scenario.traffic
            )
        );

    sim.pedestrians =
        JSON.parse(
            JSON.stringify(
                scenario.pedestrians
            )
        );

    sim.animals =
        JSON.parse(
            JSON.stringify(
                scenario.animals
            )
        );

    sim.potholes =
        JSON.parse(
            JSON.stringify(
                scenario.potholes
            )
        );

    sim.criticalObstacle = null;

    sim.decisionLog = [];

    sim.globalPath =
        generateGlobalPath();

    sim.localPath =
        sim.globalPath.map(
            p => ({
                x: p.x,
                y: p.y
            })
        );

    generateEnvironment();

    pushEvent(
        "SCENARIO INITIALIZED"
    );

}


/* =========================================================
   GLOBAL PATH
========================================================= */

function generateGlobalPath() {

    const start =
        sim.vehicle;

    const goal =
        sim.goal;

    const path = [];

    const dx =
        goal.x - start.x;

    const dy =
        goal.y - start.y;

    const length =
        Math.hypot(dx, dy);

    const steps =
        Math.max(
            40,
            Math.floor(length / 10)
        );

    for (
        let i = 0;
        i <= steps;
        i++
    ) {

        const t =
            i / steps;

        const x =
            start.x +
            dx * t;

        const y =
            start.y +
            dy * t;

        path.push({
            x,
            y
        });

    }

    return path;

}


/* =========================================================
   ENVIRONMENT
========================================================= */

function generateEnvironment() {

    sim.shops = [];

    sim.houses = [];

    sim.vendors = [];

    for (
        let x = 100;
        x < 800;
        x += 100
    ) {

        if (
            sim.scenario ===
            "market"
        ) {

            sim.shops.push({

                x,

                y: 92,

                width: 55,

                height: 42

            });

            sim.vendors.push({

                x: x + 30,

                y: 440

            });

        }

        else if (
            sim.scenario ===
            "village"
        ) {

            sim.houses.push({

                x,

                y: 100,

                width: 60,

                height: 50

            });

        }

    }

}


/* =========================================================
   DYNAMIC OBJECTS
========================================================= */

function getDynamicObjects() {

    return [

        ...sim.traffic.map(
            obj => ({
                ...obj,
                kind: "vehicle",
                radius: 19
            })
        ),

        ...sim.pedestrians.map(
            obj => ({
                ...obj,
                kind: "pedestrian",
                radius: 12
            })
        ),

        ...sim.animals.map(
            obj => ({
                ...obj,
                kind: "animal",
                radius: 16
            })
        )

    ];

}


/* =========================================================
   ACTOR PREDICTION
========================================================= */

function predictActorPosition(
    actor,
    t
) {

    const vx =
        Math.cos(actor.angle || 0) *
        (actor.speed || 0);

    const vy =
        Math.sin(actor.angle || 0) *
        (actor.speed || 0);

    return {

        x:
            actor.x +
            vx *
            SIM_SCALE *
            t,

        y:
            actor.y +
            vy *
            SIM_SCALE *
            t

    };

}


/* =========================================================
   EGO PREDICTION
========================================================= */

function predictEgoPosition(t) {

    const speed =
        Math.max(
            sim.vehicle.speed,
            0
        );

    return {

        x:
            sim.vehicle.x +
            Math.cos(
                sim.vehicle.angle
            ) *
            speed *
            SIM_SCALE *
            t,

        y:
            sim.vehicle.y +
            Math.sin(
                sim.vehicle.angle
            ) *
            speed *
            SIM_SCALE *
            t

    };

}


/* =========================================================
   PREDICTIVE CONFLICT
========================================================= */

function getPredictedConflict(
    object
) {

    const horizons = [

        0.25,
        0.5,
        0.75,
        1.0,
        1.25,
        1.5,
        2.0

    ];

    let minimumDistance =
        Infinity;

    let minimumTime = 99;

    let sideApproach = false;

    let conflict = false;

    for (
        const t of horizons
    ) {

        const ego =
            predictEgoPosition(t);

        const actor =
            predictActorPosition(
                object,
                t
            );

        const d =
            distance(
                ego.x,
                ego.y,
                actor.x,
                actor.y
            );

        if (
            d <
            minimumDistance
        ) {

            minimumDistance = d;

            minimumTime = t;

        }

        if (
            d <
            VEHICLE_RADIUS +
            object.radius +
            SAFETY_MARGIN
        ) {

            conflict = true;

        }

    }


    /* -----------------------------------------------------
       SIDE APPROACH DETECTION
    ----------------------------------------------------- */

    const fx =
        Math.cos(
            sim.vehicle.angle
        );

    const fy =
        Math.sin(
            sim.vehicle.angle
        );

    const rx = -fy;

    const ry = fx;

    const dx =
        object.x -
        sim.vehicle.x;

    const dy =
        object.y -
        sim.vehicle.y;

    const longitudinal =
        dx * fx +
        dy * fy;

    const lateral =
        dx * rx +
        dy * ry;

    const actorVx =
        Math.cos(
            object.angle || 0
        ) *
        (object.speed || 0);

    const actorVy =
        Math.sin(
            object.angle || 0
        ) *
        (object.speed || 0);

    const actorLateralVelocity =
        actorVx * rx +
        actorVy * ry;

    if (
        Math.abs(
            actorLateralVelocity
        ) > 4 &&
        Math.abs(lateral) < 150 &&
        longitudinal > -80 &&
        longitudinal < 260
    ) {

        const sideTime =
            Math.abs(lateral) /
            Math.max(
                Math.abs(
                    actorLateralVelocity
                ),
                1
            );

        const egoSpeed =
            Math.max(
                sim.vehicle.speed *
                SIM_SCALE,
                1
            );

        const egoTime =
            Math.max(
                longitudinal,
                0
            ) /
            egoSpeed;

        if (
            Math.abs(
                sideTime -
                egoTime
            ) < 1.1
        ) {

            sideApproach = true;

            conflict = true;

            minimumTime =
                Math.min(
                    minimumTime,
                    Math.max(
                        sideTime,
                        0.1
                    )
                );

        }

    }


    if (!conflict) {

        return null;

    }


    return {

        object,

        distance:
            minimumDistance,

        ttc:
            minimumTime,

        sideApproach

    };

}


/* =========================================================
   FIND MOST DANGEROUS OBSTACLE
========================================================= */

function findCriticalObstacle() {

    const objects =
        getDynamicObjects();

    let best = null;

    for (
        const object of objects
    ) {

        const conflict =
            getPredictedConflict(
                object
            );

        if (!conflict) {

            continue;

        }

        if (
            !best ||
            conflict.ttc <
            best.ttc
        ) {

            best = conflict;

        }

    }


    /* -----------------------------------------------------
       POTHOLES
    ----------------------------------------------------- */

    for (
        const pothole of sim.potholes
    ) {

        const d =
            distance(
                sim.vehicle.x,
                sim.vehicle.y,
                pothole.x,
                pothole.y
            );

        if (
            d < 110
        ) {

            const pathAngle =
                sim.vehicle.angle;

            const fx =
                Math.cos(pathAngle);

            const fy =
                Math.sin(pathAngle);

            const dx =
                pothole.x -
                sim.vehicle.x;

            const dy =
                pothole.y -
                sim.vehicle.y;

            const longitudinal =
                dx * fx +
                dy * fy;

            const lateral =
                -dx * fy +
                dy * fx;

            if (
                longitudinal > 0 &&
                longitudinal < 130 &&
                Math.abs(lateral) < 45
            ) {

                const potholeConflict = {

                    object: {

                        ...pothole,

                        type: "POTHOLE",

                        kind: "pothole",

                        radius:
                            pothole.radius

                    },

                    distance: d,

                    ttc:
                        longitudinal /
                        Math.max(
                            sim.vehicle.speed *
                            SIM_SCALE,
                            1
                        ),

                    sideApproach: false

                };


                if (
                    !best ||
                    potholeConflict.ttc <
                    best.ttc
                ) {

                    best =
                        potholeConflict;

                }

            }

        }

    }


    return best;

}


/* =========================================================
   SPEED RESPONSE
========================================================= */

function calculateObstacleSpeedResponse(
    conflict
) {

    if (!conflict) {

        return {

            targetSpeed:
                MAX_SPEED,

            urgency: 0

        };

    }


    const ttc =
        conflict.ttc;

    let target =
        MAX_SPEED;

    let urgency = 0;


    /* -----------------------------------------------------
       CLEAR / FAR
    ----------------------------------------------------- */

    if (
        ttc > 2.0
    ) {

        target =
            Math.min(
                MAX_SPEED,
                sim.vehicle.speed + 14
            );

        urgency = 0.1;

    }


    /* -----------------------------------------------------
       CAUTION
    ----------------------------------------------------- */

    else if (
        ttc > 1.3
    ) {

        target =
            Math.min(
                sim.vehicle.speed,
                58
            );

        urgency = 0.35;

    }


    /* -----------------------------------------------------
       BRAKING
    ----------------------------------------------------- */

    else if (
        ttc > 0.75
    ) {

        target =
            Math.min(
                sim.vehicle.speed,
                36
            );

        urgency = 0.65;

    }


    /* -----------------------------------------------------
       EMERGENCY
    ----------------------------------------------------- */

    else {

        target = 8;

        urgency = 1;

    }


    return {

        targetSpeed:
            target,

        urgency

    };

}


/* =========================================================
   AVOIDANCE TARGET
========================================================= */

function chooseAvoidanceTarget(
    conflict
) {

    if (!conflict) {

        return 0;

    }


    const object =
        conflict.object;

    if (
        object.kind ===
        "pothole"
    ) {

        return 1;

    }


    const fx =
        Math.cos(
            sim.vehicle.angle
        );

    const fy =
        Math.sin(
            sim.vehicle.angle
        );

    const rx = -fy;

    const ry = fx;

    const dx =
        object.x -
        sim.vehicle.x;

    const dy =
        object.y -
        sim.vehicle.y;

    const lateral =
        dx * rx +
        dy * ry;


    /* move opposite the obstacle */

    if (
        lateral >= 0
    ) {

        return -1;

    }

    return 1;

}


/* =========================================================
   START AVOIDANCE
========================================================= */

function startAvoidance(
    conflict
) {

    if (
        sim.avoidance.cooldown >
        0
    ) {

        return;

    }

    const side =
        chooseAvoidanceTarget(
            conflict
        );

    sim.avoidance.active =
        true;

    sim.avoidance.side =
        side;

    sim.avoidance.targetOffset =
        side * 58;

    sim.avoidance.timer =
        0;

    sim.avoidance.cooldown =
        1.5;

    sim.replanCount++;

    pushEvent(
        side > 0
            ? "RIGHT CORRIDOR SELECTED"
            : "LEFT CORRIDOR SELECTED"
    );

}


/* =========================================================
   UPDATE AVOIDANCE
========================================================= */

function updateAvoidance(
    delta,
    conflict
) {

    if (
        sim.avoidance.cooldown >
        0
    ) {

        sim.avoidance.cooldown -=
            delta;

    }


    if (
        conflict &&
        conflict.ttc <
        1.5
    ) {

        if (
            !sim.avoidance.active
        ) {

            startAvoidance(
                conflict
            );

        }

    }


    if (
        !sim.avoidance.active
    ) {

        sim.avoidance.offset =
            lerp(
                sim.avoidance.offset,
                0,
                0.08
            );

        return;

    }


    sim.avoidance.timer +=
        delta;


    /* -----------------------------------------------------
       IF OBSTACLE CLEARED
    ----------------------------------------------------- */

    if (
        !conflict ||
        conflict.ttc > 2.0
    ) {

        sim.avoidance.targetOffset =
            0;

        if (
            Math.abs(
                sim.avoidance.offset
            ) < 3
        ) {

            sim.avoidance.active =
                false;

            sim.avoidance.side =
                0;

            pushEvent(
                "ORIGINAL TRAJECTORY RESTORED"
            );

        }

    }


    sim.avoidance.offset =
        lerp(
            sim.avoidance.offset,
            sim.avoidance.targetOffset,
            Math.min(
                1,
                delta * 4
            )
        );

}


/* =========================================================
   GET TRAJECTORY TARGET
========================================================= */

function getTrajectoryTarget() {

    const path =
        sim.globalPath;

    if (
        !path.length
    ) {

        return sim.goal;

    }


    let nearestIndex = 0;

    let nearestDistance =
        Infinity;


    for (
        let i = 0;
        i < path.length;
        i++
    ) {

        const d =
            distance(
                sim.vehicle.x,
                sim.vehicle.y,
                path[i].x,
                path[i].y
            );

        if (
            d <
            nearestDistance
        ) {

            nearestDistance =
                d;

            nearestIndex =
                i;

        }

    }


    const lookAhead =
        clamp(
            Math.floor(
                sim.vehicle.speed *
                0.11
            ),
            5,
            16
        );


    const index =
        Math.min(
            path.length - 1,
            nearestIndex +
            lookAhead
        );


    let target =
        path[index];


    /* -----------------------------------------------------
       LOCAL LATERAL OFFSET
    ----------------------------------------------------- */

    if (
        Math.abs(
            sim.avoidance.offset
        ) > 1
    ) {

        const angle =
            Math.atan2(
                sim.goal.y -
                sim.vehicle.y,

                sim.goal.x -
                sim.vehicle.x
            );

        const rx =
            -Math.sin(angle);

        const ry =
            Math.cos(angle);

        target = {

            x:
                target.x +
                rx *
                sim.avoidance.offset,

            y:
                target.y +
                ry *
                sim.avoidance.offset

        };

    }


    return target;

}


/* =========================================================
   STEERING
========================================================= */

function calculateSteeringToTarget(
    target,
    delta
) {

    const dx =
        target.x -
        sim.vehicle.x;

    const dy =
        target.y -
        sim.vehicle.y;

    const targetAngle =
        Math.atan2(
            dy,
            dx
        );

    const error =
        normalizeAngle(
            targetAngle -
            sim.vehicle.angle
        );


    const desiredSteering =
        clamp(
            error * 1.8,
            -0.65,
            0.65
        );


    const maxChange =
        MAX_STEER_RATE *
        delta;


    const difference =
        desiredSteering -
        sim.vehicle.steering;


    sim.vehicle.steering +=
        clamp(
            difference,
            -maxChange,
            maxChange
        );


    return sim.vehicle.steering;

}


/* =========================================================
   VEHICLE UPDATE
========================================================= */

function updateVehicle(
    delta
) {

    if (
        sim.completed
    ) {

        return;

    }


    const conflict =
        findCriticalObstacle();

    sim.criticalObstacle =
        conflict;


    const speedResponse =
        calculateObstacleSpeedResponse(
            conflict
        );


    updateAvoidance(
        delta,
        conflict
    );


    /* -----------------------------------------------------
       BEHAVIOR
    ----------------------------------------------------- */

    let newBehavior =
        "CRUISE";


    if (
        conflict
    ) {

        if (
            conflict.ttc <
            0.75
        ) {

            newBehavior =
                "BRAKE";

        }

        else if (
            conflict.ttc <
            1.4
        ) {

            newBehavior =
                "CAUTION";

        }

        else {

            newBehavior =
                "CAUTION";

        }

        if (
            sim.avoidance.active
        ) {

            newBehavior =
                "AVOID";

        }

    }

    else if (
        sim.avoidance.active
    ) {

        newBehavior =
            "RECOVER";

    }


    if (
        newBehavior !==
        sim.behavior
    ) {

        sim.previousBehavior =
            sim.behavior;

        sim.behavior =
            newBehavior;

        pushEvent(
            newBehavior === "BRAKE"
                ? "EMERGENCY BRAKING"
                : newBehavior === "CAUTION"
                ? "COLLISION RISK DETECTED"
                : newBehavior === "AVOID"
                ? "ADAPTIVE TRAJECTORY ACTIVE"
                : newBehavior === "RECOVER"
                ? "REJOINING NOMINAL PATH"
                : "ROAD CLEAR — CRUISING"
        );

    }


    /* -----------------------------------------------------
       SPEED CONTROL
    ----------------------------------------------------- */

    let desiredSpeed =
        speedResponse.targetSpeed;


    if (
        sim.behavior ===
        "AVOID"
    ) {

        desiredSpeed =
            Math.min(
                desiredSpeed,
                42
            );

    }


    if (
        sim.behavior ===
        "BRAKE"
    ) {

        desiredSpeed =
            Math.min(
                desiredSpeed,
                12
            );

    }


    /* Never allow speed to become negative */

    desiredSpeed =
        Math.max(
            0,
            desiredSpeed
        );


    const speedDifference =
        desiredSpeed -
        sim.vehicle.speed;


    let acceleration;


    if (
        speedDifference >= 0
    ) {

        acceleration =
            Math.min(
                speedDifference *
                1.7,
                MAX_ACCEL
            );

    }

    else {

        acceleration =
            Math.max(
                speedDifference *
                2.1,
                -MAX_BRAKE
            );

    }


    sim.vehicle.acceleration =
        acceleration;


    sim.vehicle.speed +=
        acceleration *
        delta;


    sim.vehicle.speed =
        clamp(
            sim.vehicle.speed,
            0,
            MAX_SPEED
        );


    /* -----------------------------------------------------
       TRAJECTORY
    ----------------------------------------------------- */

    const target =
        getTrajectoryTarget();


    calculateSteeringToTarget(
        target,
        delta
    );


    /* -----------------------------------------------------
       VEHICLE HEADING
       Limited turning = realistic
    ----------------------------------------------------- */

    const speedFactor =
        clamp(
            sim.vehicle.speed /
            65,
            0.35,
            1
        );


    const headingRate =
        sim.vehicle.steering *
        speedFactor *
        0.9;


    sim.vehicle.angle +=
        headingRate *
        delta;


    sim.vehicle.angle =
        normalizeAngle(
            sim.vehicle.angle
        );


    /* -----------------------------------------------------
       POSITION
    ----------------------------------------------------- */

    const oldX =
        sim.vehicle.x;

    const oldY =
        sim.vehicle.y;


    const velocity =
        sim.vehicle.speed *
        SIM_SCALE;


    sim.vehicle.x +=
        Math.cos(
            sim.vehicle.angle
        ) *
        velocity *
        delta;

    sim.vehicle.y +=
        Math.sin(
            sim.vehicle.angle
        ) *
        velocity *
        delta;


    /* -----------------------------------------------------
       ROAD BOUNDARY
    ----------------------------------------------------- */

    sim.vehicle.x =
        clamp(
            sim.vehicle.x,
            WORLD.roadLeft + 15,
            WORLD.roadRight - 15
        );

    sim.vehicle.y =
        clamp(
            sim.vehicle.y,
            WORLD.roadTop + 15,
            WORLD.roadBottom - 15
        );


    /* -----------------------------------------------------
       DISTANCE
    ----------------------------------------------------- */

    const moved =
        distance(
            oldX,
            oldY,
            sim.vehicle.x,
            sim.vehicle.y
        );


    sim.vehicle.distanceTravelled +=
        moved;


    sim.progress =
        clamp(
            1 -
            distance(
                sim.vehicle.x,
                sim.vehicle.y,
                sim.goal.x,
                sim.goal.y
            ) /
            Math.max(
                distance(
                    scenarios[
                        sim.scenario
                    ].start.x,

                    scenarios[
                        sim.scenario
                    ].start.y,

                    sim.goal.x,

                    sim.goal.y
                ),
                1
            ),
            0,
            1
        );


    /* -----------------------------------------------------
       HARD SAFETY BRAKE
       Prevent numerical overlap
    ----------------------------------------------------- */

    const immediate =
        getDynamicObjects();

    for (
        const actor of immediate
    ) {

        const d =
            distance(
                sim.vehicle.x,
                sim.vehicle.y,
                actor.x,
                actor.y
            );

        const minimum =
            VEHICLE_RADIUS +
            actor.radius +
            5;


        if (
            d <
            minimum
        ) {

            sim.vehicle.speed =
                Math.min(
                    sim.vehicle.speed,
                    4
                );

            const pushAngle =
                Math.atan2(
                    sim.vehicle.y -
                    actor.y,

                    sim.vehicle.x -
                    actor.x
                );

            sim.vehicle.x =
                actor.x +
                Math.cos(
                    pushAngle
                ) *
                minimum;

            sim.vehicle.y =
                actor.y +
                Math.sin(
                    pushAngle
                ) *
                minimum;

            pushEvent(
                "SAFETY BRAKE — COLLISION AVOIDED"
            );

        }

    }


    /* -----------------------------------------------------
       GOAL CHECK
    ----------------------------------------------------- */

    const goalDistance =
        distance(
            sim.vehicle.x,
            sim.vehicle.y,
            sim.goal.x,
            sim.goal.y
        );


    if (
        goalDistance <
        GOAL_RADIUS
    ) {

        sim.completed =
            true;

        sim.vehicle.speed =
            0;

        sim.vehicle.acceleration =
            -MAX_BRAKE;

        sim.behavior =
            "ARRIVED";

        pushEvent(
            "DESTINATION REACHED"
        );

    }

}


/* =========================================================
   TRAFFIC UPDATE
========================================================= */

function updateTraffic(
    delta
) {

    for (
        const actor of sim.traffic
    ) {

        const variation =
            1 +
            Math.sin(
                sim.elapsed *
                0.8 +
                actor.x *
                0.01
            ) *
            0.08;


        const effectiveSpeed =
            actor.speed *
            variation;


        actor.x +=
            Math.cos(
                actor.angle
            ) *
            effectiveSpeed *
            SIM_SCALE *
            delta;


        actor.y +=
            Math.sin(
                actor.angle
            ) *
            effectiveSpeed *
            SIM_SCALE *
            delta;


        /* -------------------------------------------------
           WRAP / BOUNCE
        ------------------------------------------------- */

        if (
            actor.x <
            WORLD.roadLeft - 40
        ) {

            actor.x =
                WORLD.roadRight - 30;

        }

        if (
            actor.x >
            WORLD.roadRight + 40
        ) {

            actor.x =
                WORLD.roadLeft + 30;

        }

        if (
            actor.y <
            WORLD.roadTop - 40
        ) {

            actor.y =
                WORLD.roadBottom - 30;

        }

        if (
            actor.y >
            WORLD.roadBottom + 40
        ) {

            actor.y =
                WORLD.roadTop + 30;

        }

    }

}


/* =========================================================
   PEDESTRIANS
========================================================= */

function updatePedestrians(
    delta
) {

    for (
        const p of sim.pedestrians
    ) {

        p.x +=
            p.vx *
            delta;

        p.y +=
            p.vy *
            delta;


        if (
            p.x < 100 ||
            p.x > 800
        ) {

            p.vx *= -1;

        }

        if (
            p.y < 100 ||
            p.y > 450
        ) {

            p.vy *= -1;

        }

    }

}


/* =========================================================
   ANIMALS
========================================================= */

function updateAnimals(
    delta
) {

    for (
        const animal of sim.animals
    ) {

        animal.x +=
            animal.vx *
            delta;

        animal.y +=
            animal.vy *
            delta;


        if (
            animal.x < 100 ||
            animal.x > 800
        ) {

            animal.vx *= -1;

        }

        if (
            animal.y < 100 ||
            animal.y > 450
        ) {

            animal.vy *= -1;

        }

    }

}


/* =========================================================
   TELEMETRY
========================================================= */

function updateTelemetry() {

    const conflict =
        sim.criticalObstacle;


    let risk =
        5;


    if (
        conflict
    ) {

        risk =
            clamp(
                100 -
                conflict.ttc *
                38,
                15,
                100
            );

    }


    sim.metrics.risk =
        Math.round(risk);


    sim.metrics.speed =
        Math.round(
            sim.vehicle.speed
        );


    sim.metrics.steering =
        sim.vehicle.steering;


    sim.metrics.acceleration =
        sim.vehicle.acceleration;


    sim.metrics.ttc =
        conflict
            ? conflict.ttc
            : 99;


    sim.metrics.braking =
        Math.max(
            0,
            -sim.vehicle.acceleration
        );


    sim.metrics.travel =
        Math.round(
            sim.vehicle.distanceTravelled
        );


    sim.metrics.lateralError =
        calculateLateralError();


    sim.metrics.vehicles =
        sim.traffic.length;


    sim.metrics.pedestrians =
        sim.pedestrians.length;


    sim.metrics.obstacles =
        sim.potholes.length;


    sim.metrics.objects =
        sim.traffic.length +
        sim.pedestrians.length +
        sim.animals.length +
        sim.potholes.length;


    sim.metrics.smoothness =
        Math.round(
            clamp(
                100 -
                Math.abs(
                    sim.vehicle.steering
                ) *
                20 -
                Math.abs(
                    sim.vehicle.acceleration
                ) *
                0.5,
                55,
                100
            )
        );


    sim.metrics.score =
        Math.round(
            clamp(
                100 -
                sim.metrics.risk *
                0.15 +
                sim.metrics.smoothness *
                0.05,
                0,
                100
            )
        );


    updateElement(
        "score",
        sim.metrics.score
    );

    updateElement(
        "risk",
        sim.metrics.risk + "%"
    );

    updateElement(
        "trav",
        Math.round(
            sim.progress * 100
        ) + "%"
    );

    updateElement(
        "smooth",
        sim.metrics.smoothness + "%"
    );

    updateElement(
        "speed",
        sim.metrics.speed +
        " km/h"
    );

    updateElement(
        "latency",
        Math.round(
            sim.metrics.latency
        ) +
        " ms"
    );

    updateElement(
        "latency2",
        Math.round(
            sim.metrics.latency
        ) +
        " ms"
    );


    const alertTitle =
        document.getElementById(
            "alertTitle"
        );

    const alertText =
        document.getElementById(
            "alertText"
        );


    if (
        alertTitle &&
        alertText
    ) {

        if (
            sim.completed
        ) {

            alertTitle.textContent =
                "DESTINATION REACHED";

            alertText.textContent =
                "Vehicle successfully completed the adaptive route.";

        }

        else if (
            sim.behavior ===
            "BRAKE"
        ) {

            alertTitle.textContent =
                "HIGH COLLISION RISK";

            alertText.textContent =
                "Predictive braking activated.";

        }

        else if (
            sim.behavior ===
            "AVOID"
        ) {

            alertTitle.textContent =
                "ADAPTIVE AVOIDANCE";

            alertText.textContent =
                "Safe corridor selected.";

        }

        else {

            alertTitle.textContent =
                "ROAD CONDITIONS NOMINAL";

            alertText.textContent =
                "RoadSense continuously monitoring.";

        }

    }

}


/* =========================================================
   LATERAL ERROR
========================================================= */

function calculateLateralError() {

    if (
        !sim.globalPath.length
    ) {

        return 0;

    }


    let nearest =
        Infinity;


    for (
        const point of sim.globalPath
    ) {

        const d =
            distance(
                sim.vehicle.x,
                sim.vehicle.y,
                point.x,
                point.y
            );

        nearest =
            Math.min(
                nearest,
                d
            );

    }


    return nearest;

}


/* =========================================================
   DOM UPDATE
========================================================= */

function updateElement(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (
        element
    ) {

        element.textContent =
            value;

    }

}


/* =========================================================
   PARTICLES
========================================================= */

function spawnParticle(
    x,
    y
) {

    sim.particles.push({

        x,

        y,

        vx:
            (Math.random() - 0.5) *
            15,

        vy:
            (Math.random() - 0.5) *
            15,

        life: 1,

        size:
            Math.random() *
            2.5 +
            1

    });

}


function updateParticles(
    delta
) {

    if (
        Math.random() <
        0.35
    ) {

        spawnParticle(
            sim.vehicle.x,
            sim.vehicle.y
        );

    }


    for (
        const p of sim.particles
    ) {

        p.x +=
            p.vx *
            delta;

        p.y +=
            p.vy *
            delta;

        p.life -=
            delta *
            0.8;

    }


    sim.particles =
        sim.particles.filter(
            p =>
                p.life > 0
        );

}


/* =========================================================
   SENSOR SCAN EFFECT
========================================================= */

function updateSensorScan() {

    sim.scanPoints = [];

    const radius = 145;

    for (
        let i = 0;
        i < 55;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;

        const r =
            Math.random() *
            radius;

        sim.scanPoints.push({

            x:
                sim.vehicle.x +
                Math.cos(angle) *
                r,

            y:
                sim.vehicle.y +
                Math.sin(angle) *
                r,

            life:
                Math.random()

        });

    }

}


/* =========================================================
   DRAW BACKGROUND
========================================================= */

function drawBackground() {

    if (!ctx) return;


    ctx.fillStyle =
        "#05080d";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /* GRID */

    ctx.save();

    ctx.strokeStyle =
        "rgba(0,220,255,0.055)";

    ctx.lineWidth = 1;


    for (
        let x = 0;
        x < WORLD.width;
        x += 25
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            WORLD.height
        );

        ctx.stroke();

    }


    for (
        let y = 0;
        y < WORLD.height;
        y += 25
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            WORLD.width,
            y
        );

        ctx.stroke();

    }

    ctx.restore();


    /* ROAD */

    ctx.fillStyle =
        "#171b21";

    ctx.fillRect(
        WORLD.roadLeft,
        WORLD.roadTop,
        WORLD.roadRight -
        WORLD.roadLeft,
        WORLD.roadBottom -
        WORLD.roadTop
    );


    /* ROAD EDGE */

    ctx.strokeStyle =
        "rgba(255,255,255,0.14)";

    ctx.lineWidth = 3;

    ctx.strokeRect(
        WORLD.roadLeft,
        WORLD.roadTop,
        WORLD.roadRight -
        WORLD.roadLeft,
        WORLD.roadBottom -
        WORLD.roadTop
    );


    /* ROAD CENTER */

    ctx.save();

    ctx.strokeStyle =
        "rgba(255,210,90,0.35)";

    ctx.lineWidth = 2;

    ctx.setLineDash([
        24,
        18
    ]);

    ctx.beginPath();

    ctx.moveTo(
        WORLD.roadLeft,
        WORLD.centerY
    );

    ctx.lineTo(
        WORLD.roadRight,
        WORLD.centerY
    );

    ctx.stroke();

    ctx.restore();

}


/* =========================================================
   DRAW ENVIRONMENT
========================================================= */

function drawEnvironment() {

    if (!ctx) return;


    /* BUILDINGS */

    for (
        const house of sim.houses
    ) {

        ctx.fillStyle =
            "rgba(120,100,75,0.45)";

        ctx.fillRect(
            house.x,
            house.y,
            house.width,
            house.height
        );

    }


    for (
        const shop of sim.shops
    ) {

        ctx.fillStyle =
            "rgba(90,65,45,0.65)";

        ctx.fillRect(
            shop.x,
            shop.y,
            shop.width,
            shop.height
        );

    }


    /* VENDORS */

    for (
        const vendor of sim.vendors
    ) {

        ctx.fillStyle =
            "rgba(255,150,60,0.65)";

        ctx.beginPath();

        ctx.arc(
            vendor.x,
            vendor.y,
            8,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }

}


/* =========================================================
   DRAW GLOBAL TRAJECTORY
========================================================= */

function drawGlobalPath() {

    if (
        !ctx ||
        sim.globalPath.length <
        2
    ) {

        return;

    }


    ctx.save();

    ctx.strokeStyle =
        "rgba(0,229,255,0.18)";

    ctx.lineWidth = 7;

    ctx.lineCap =
        "round";

    ctx.beginPath();


    sim.globalPath.forEach(
        (p, i) => {

            if (
                i === 0
            ) {

                ctx.moveTo(
                    p.x,
                    p.y
                );

            }

            else {

                ctx.lineTo(
                    p.x,
                    p.y
                );

            }

        }
    );


    ctx.stroke();

    ctx.restore();

}


/* =========================================================
   DRAW ACTIVE TRAJECTORY
========================================================= */

function drawActivePath() {

    if (
        !ctx
    ) return;


    const path =
        sim.globalPath;

    if (
        !path.length
    ) return;


    ctx.save();

    ctx.strokeStyle =
        sim.behavior === "BRAKE"
            ? "#ff5266"
            : sim.behavior === "AVOID"
            ? "#ffc857"
            : "#00e5ff";

    ctx.lineWidth = 3;

    ctx.shadowBlur = 12;

    ctx.shadowColor =
        sim.behavior === "BRAKE"
            ? "#ff5266"
            : "#00e5ff";

    ctx.lineCap =
        "round";

    ctx.beginPath();


    for (
        let i = 0;
        i < path.length;
        i++
    ) {

        let p =
            path[i];


        if (
            sim.avoidance.active &&
            i > 5
        ) {

            const angle =
                Math.atan2(
                    sim.goal.y -
                    sim.vehicle.y,

                    sim.goal.x -
                    sim.vehicle.x
                );

            const rx =
                -Math.sin(angle);

            const ry =
                Math.cos(angle);

            const fade =
                clamp(
                    i /
                    path.length,
                    0,
                    1
                );

            p = {

                x:
                    p.x +
                    rx *
                    sim.avoidance.offset *
                    (1 - fade),

                y:
                    p.y +
                    ry *
                    sim.avoidance.offset *
                    (1 - fade)

            };

        }


        if (
            i === 0
        ) {

            ctx.moveTo(
                p.x,
                p.y
            );

        }

        else {

            ctx.lineTo(
                p.x,
                p.y
            );

        }

    }


    ctx.stroke();

    ctx.restore();

}


/* =========================================================
   DRAW GOAL
========================================================= */

function drawGoal() {

    if (!ctx) return;


    const pulse =
        5 +
        Math.sin(
            sim.elapsed * 3
        ) *
        3;


    ctx.save();

    ctx.strokeStyle =
        "rgba(0,255,170,0.8)";

    ctx.lineWidth = 2;

    ctx.shadowBlur = 20;

    ctx.shadowColor =
        "#00ffaa";


    ctx.beginPath();

    ctx.arc(
        sim.goal.x,
        sim.goal.y,
        18 + pulse,
        0,
        Math.PI * 2
    );

    ctx.stroke();


    ctx.fillStyle =
        "rgba(0,255,170,0.12)";

    ctx.beginPath();

    ctx.arc(
        sim.goal.x,
        sim.goal.y,
        28 + pulse,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
        "#00ffaa";

    ctx.font =
        "bold 10px monospace";

    ctx.fillText(
        "DESTINATION",
        sim.goal.x - 32,
        sim.goal.y - 34
    );

    ctx.restore();

}


/* =========================================================
   DRAW SENSOR EFFECT
========================================================= */

function drawSensorEffect() {

    if (!ctx) return;


    const radius =
        55 +
        Math.sin(
            sim.elapsed * 2.5
        ) *
        10;


    ctx.save();

    ctx.strokeStyle =
        "rgba(0,229,255,0.13)";

    ctx.lineWidth = 1;


    for (
        let i = 1;
        i <= 3;
        i++
    ) {

        ctx.beginPath();

        ctx.arc(
            sim.vehicle.x,
            sim.vehicle.y,
            radius * i,
            0,
            Math.PI * 2
        );

        ctx.stroke();

    }


    for (
        const point of sim.scanPoints
    ) {

        ctx.fillStyle =
            `rgba(0,229,255,${point.life * 0.45})`;

        ctx.fillRect(
            point.x,
            point.y,
            2,
            2
        );

    }

    ctx.restore();

}


/* =========================================================
   DRAW VEHICLE
========================================================= */

function drawVehicle() {

    if (!ctx) return;


    const v =
        sim.vehicle;


    ctx.save();

    ctx.translate(
        v.x,
        v.y
    );

    ctx.rotate(
        v.angle
    );


    /* GLOW */

    ctx.shadowBlur =
        24;

    ctx.shadowColor =
        "#00e5ff";


    /* BODY */

    ctx.fillStyle =
        "#dce6ed";

    ctx.fillRect(
        -17,
        -9,
        34,
        18
    );


    /* CABIN */

    ctx.fillStyle =
        "#24323e";

    ctx.fillRect(
        -5,
        -7,
        13,
        14
    );


    /* FRONT */

    ctx.fillStyle =
        "#00e5ff";

    ctx.fillRect(
        12,
        -6,
        4,
        12
    );


    /* REAR */

    ctx.fillStyle =
        "#ff5266";

    ctx.fillRect(
        -17,
        -6,
        3,
        12
    );


    /* WHEELS */

    ctx.fillStyle =
        "#080b0f";

    ctx.fillRect(
        -10,
        -11,
        7,
        3
    );

    ctx.fillRect(
        6,
        -11,
        7,
        3
    );

    ctx.fillRect(
        -10,
        8,
        7,
        3
    );

    ctx.fillRect(
        6,
        8,
        7,
        3
    );


    ctx.restore();


    /* HEADING VECTOR */

    ctx.save();

    ctx.strokeStyle =
        "rgba(0,229,255,0.5)";

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(
        v.x,
        v.y
    );

    ctx.lineTo(
        v.x +
        Math.cos(v.angle) *
        65,

        v.y +
        Math.sin(v.angle) *
        65
    );

    ctx.stroke();

    ctx.restore();

}


/* =========================================================
   DRAW TRAFFIC
========================================================= */

function drawTraffic() {

    if (!ctx) return;


    for (
        const actor of sim.traffic
    ) {

        ctx.save();

        ctx.translate(
            actor.x,
            actor.y
        );

        ctx.rotate(
            actor.angle
        );


        let bodyColor =
            "#e2e7eb";


        if (
            actor.type ===
            "TRUCK"
        ) {

            bodyColor =
                "#b6c1ca";

        }

        if (
            actor.type ===
            "AUTO"
        ) {

            bodyColor =
                "#d8b735";

        }

        if (
            actor.type ===
            "BIKE"
        ) {

            bodyColor =
                "#c2cbd2";

        }

        if (
            actor.type ===
            "TRACTOR"
        ) {

            bodyColor =
                "#68b56f";

        }


        ctx.shadowBlur =
            8;

        ctx.shadowColor =
            "rgba(255,255,255,0.15)";


        ctx.fillStyle =
            bodyColor;

        ctx.fillRect(
            -14,
            -8,
            28,
            16
        );


        ctx.fillStyle =
            "#111820";

        ctx.fillRect(
            -4,
            -6,
            10,
            12
        );


        ctx.restore();

    }

}


/* =========================================================
   DRAW PEDESTRIANS
========================================================= */

function drawPedestrians() {

    if (!ctx) return;


    for (
        const p of sim.pedestrians
    ) {

        ctx.save();

        ctx.fillStyle =
            "#ffca70";

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.strokeStyle =
            "#dce6ed";

        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.moveTo(
            p.x,
            p.y + 5
        );

        ctx.lineTo(
            p.x,
            p.y + 14
        );

        ctx.stroke();

        ctx.restore();

    }

}


/* =========================================================
   DRAW ANIMALS
========================================================= */

function drawAnimals() {

    if (!ctx) return;


    for (
        const animal of sim.animals
    ) {

        ctx.save();

        ctx.fillStyle =
            animal.type === "COW"
                ? "#a98d73"
                : "#b9a078";


        ctx.beginPath();

        ctx.ellipse(
            animal.x,
            animal.y,
            15,
            9,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.restore();

    }

}


/* =========================================================
   DRAW POTHOLES
========================================================= */

function drawPotholes() {

    if (!ctx) return;


    for (
        const p of sim.potholes
    ) {

        ctx.save();

        ctx.fillStyle =
            "#07090c";

        ctx.strokeStyle =
            "rgba(255,180,70,0.45)";

        ctx.lineWidth = 2;


        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.stroke();


        ctx.restore();

    }

}


/* =========================================================
   DRAW PARTICLES
========================================================= */

function drawParticles() {

    if (!ctx) return;


    ctx.save();

    for (
        const p of sim.particles
    ) {

        ctx.fillStyle =
            `rgba(0,229,255,${p.life * 0.5})`;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }

    ctx.restore();

}


/* =========================================================
   MAIN RENDER
========================================================= */

function render() {

    if (!ctx) return;


    drawBackground();

    drawEnvironment();

    drawGlobalPath();

    drawActivePath();

    drawSensorEffect();

    drawPotholes();

    drawTraffic();

    drawPedestrians();

    drawAnimals();

    drawParticles();

    drawGoal();

    drawVehicle();

}


/* =========================================================
   ANIMATION LOOP
========================================================= */

let lastFrame =
    performance.now();


function animationLoop(
    timestamp
) {

    const delta =
        Math.min(
            (timestamp -
                lastFrame) /
                1000,
            0.05
        );


    lastFrame =
        timestamp;


    if (
        sim.running
    ) {

        sim.elapsed +=
            delta;


        updateVehicle(
            delta
        );

        updateTraffic(
            delta
        );

        updatePedestrians(
            delta
        );

        updateAnimals(
            delta
        );

        updateParticles(
            delta
        );

        updateSensorScan();

        updateTelemetry();

        render();

    }


    requestAnimationFrame(
        animationLoop
    );

}


/* =========================================================
   SCENARIO SELECTOR
========================================================= */

const scenarioSelect =
    document.querySelector(
        ".controlPanel select"
    );


if (
    scenarioSelect
) {

    scenarioSelect.addEventListener(
        "change",
        event => {

            const value =
                event.target.value
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        ""
                    );


            let scenario =
                "junction";


            if (
                value.includes(
                    "village"
                )
            ) {

                scenario =
                    "village";

            }

            else if (
                value.includes(
                    "market"
                )
            ) {

                scenario =
                    "market";

            }

            else if (
                value.includes(
                    "highway"
                )
            ) {

                scenario =
                    "highway";

            }


            loadScenario(
                scenario
            );

        }
    );

}


/* =========================================================
   GENERATE ADAPTIVE PATH BUTTON
========================================================= */

const pathButtons =
    document.querySelectorAll(
        ".controlPanel button"
    );


pathButtons.forEach(
    button => {

        if (
            button.textContent
                .includes(
                    "GENERATE"
                )
        ) {

            button.addEventListener(
                "click",
                () => {

                    sim.globalPath =
                        generateGlobalPath();

                    sim.avoidance.active =
                        false;

                    sim.avoidance.offset =
                        0;

                    pushEvent(
                        "NEW ADAPTIVE TRAJECTORY GENERATED"
                    );

                }
            );

        }


        if (
            button.textContent
                .includes(
                    "SIMULATE"
                )
        ) {

            button.addEventListener(
                "click",
                () => {

                    sim.criticalObstacle =
                        findCriticalObstacle();

                    sim.replanCount++;

                    pushEvent(
                        "REPLANNING CYCLE FORCED"
                    );

                }
            );

        }

    }
);


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === " "
        ) {

            sim.running =
                !sim.running;

        }


        if (
            event.key === "r" ||
            event.key === "R"
        ) {

            loadScenario(
                sim.scenario
            );

        }

    }
);


/* =========================================================
   PROJECT PANELS
========================================================= */

function openProjectPanel(
    type
) {

    const existing =
        document.getElementById(
            "projectOverlay"
        );


    if (
        existing
    ) {

        existing.remove();

    }


    let title =
        "ROAD SENSE";

    let content =
        "";


    if (
        type ===
        "overview"
    ) {

        title =
            "PROJECT OVERVIEW";

        content = `

            <p>
                <strong>RoadSense</strong> is an
                adaptive path-planning system designed
                for autonomous vehicles operating on
                unstructured Indian roads.
            </p>

            <p>
                The system continuously perceives
                surrounding traffic, predicts obstacle
                motion, evaluates collision risk and
                dynamically modifies speed and trajectory.
            </p>

            <div class="info-grid">

                <div>
                    <span>PROBLEM</span>
                    <strong>
                        Unstructured Indian Roads
                    </strong>
                </div>

                <div>
                    <span>CORE</span>
                    <strong>
                        Adaptive Trajectory Planning
                    </strong>
                </div>

                <div>
                    <span>PERCEPTION</span>
                    <strong>
                        Multi-Sensor Fusion
                    </strong>
                </div>

                <div>
                    <span>DECISION</span>
                    <strong>
                        Predictive Risk Analysis
                    </strong>
                </div>

            </div>

        `;

    }


    else if (
        type ===
        "architecture"
    ) {

        title =
            "SYSTEM ARCHITECTURE";

        content = `

            <div class="architecture-flow">

                <div>
                    CAMERA / LiDAR / RADAR / GPS
                </div>

                <span>↓</span>

                <div>
                    ENVIRONMENT PERCEPTION
                </div>

                <span>↓</span>

                <div>
                    OBJECT TRACKING
                </div>

                <span>↓</span>

                <div>
                    MOTION PREDICTION
                </div>

                <span>↓</span>

                <div>
                    TTC + COLLISION RISK
                </div>

                <span>↓</span>

                <div>
                    FREE-SPACE ANALYSIS
                </div>

                <span>↓</span>

                <div>
                    ADAPTIVE PATH PLANNER
                </div>

                <span>↓</span>

                <div>
                    SPEED + STEERING CONTROL
                </div>

                <span>↓</span>

                <div>
                    CONTINUOUS REPLANNING
                </div>

            </div>

        `;

    }


    else if (
        type ===
        "technology"
    ) {

        title =
            "TECHNOLOGY STACK";

        content = `

            <div class="info-grid">

                <div>
                    <span>FRONTEND</span>
                    <strong>
                        HTML • CSS • JavaScript
                    </strong>
                </div>

                <div>
                    <span>SIMULATION</span>
                    <strong>
                        HTML5 Canvas
                    </strong>
                </div>

                <div>
                    <span>BACKEND</span>
                    <strong>
                        Python
                    </strong>
                </div>

                <div>
                    <span>VEHICLE MODEL</span>
                    <strong>
                        Kinematic Vehicle Model
                    </strong>
                </div>

                <div>
                    <span>PREDICTION</span>
                    <strong>
                        Multi-Horizon Prediction
                    </strong>
                </div>

                <div>
                    <span>DECISION</span>
                    <strong>
                        TTC + Risk-Aware Planning
                    </strong>
                </div>

            </div>

        `;

    }


    else if (
        type ===
        "algorithm"
    ) {

        title =
            "ADAPTIVE PLANNING ALGORITHM";

        content = `

            <div class="algorithm-list">

                <div>
                    <b>01</b>
                    Perceive road environment
                </div>

                <div>
                    <b>02</b>
                    Detect vehicles, pedestrians
                    and road hazards
                </div>

                <div>
                    <b>03</b>
                    Predict future obstacle positions
                </div>

                <div>
                    <b>04</b>
                    Calculate TTC and separation
                </div>

                <div>
                    <b>05</b>
                    Detect lateral side conflicts
                </div>

                <div>
                    <b>06</b>
                    Adapt vehicle speed
                </div>

                <div>
                    <b>07</b>
                    Select safe corridor
                </div>

                <div>
                    <b>08</b>
                    Generate local trajectory
                </div>

                <div>
                    <b>09</b>
                    Track trajectory smoothly
                </div>

                <div>
                    <b>10</b>
                    Restore nominal trajectory
                </div>

            </div>

        `;

    }


    else if (
        type ===
        "decision"
    ) {

        title =
            "WHY DID ROAD SENSE REPLAN?";


        const obstacle =
            sim.criticalObstacle;


        if (
            obstacle
        ) {

            const object =
                obstacle.object || {};


            const objectType =
                object.type ||
                object.kind ||
                "UNKNOWN";


            content = `

                <div class="info-grid">

                    <div>
                        <span>OBJECT</span>
                        <strong>
                            ${objectType}
                        </strong>
                    </div>

                    <div>
                        <span>DISTANCE</span>
                        <strong>
                            ${Math.round(
                                obstacle.distance
                            )} px
                        </strong>
                    </div>

                    <div>
                        <span>PREDICTED TTC</span>
                        <strong>
                            ${obstacle.ttc.toFixed(2)} s
                        </strong>
                    </div>

                    <div>
                        <span>CONFLICT</span>
                        <strong>
                            ${
                                obstacle.sideApproach
                                    ? "LATERAL / CROSSING"
                                    : "FRONTAL"
                            }
                        </strong>
                    </div>

                    <div>
                        <span>BEHAVIOR</span>
                        <strong>
                            ${sim.behavior}
                        </strong>
                    </div>

                    <div>
                        <span>DECISION</span>
                        <strong>
                            ${sim.eventText}
                        </strong>
                    </div>

                </div>

                <div class="algorithm-list">

                    <div>
                        <b>→</b>
                        Predict future obstacle position
                    </div>

                    <div>
                        <b>→</b>
                        Compare predicted occupancy
                        with vehicle corridor
                    </div>

                    <div>
                        <b>→</b>
                        Calculate collision risk
                    </div>

                    <div>
                        <b>→</b>
                        Adapt speed
                    </div>

                    <div>
                        <b>→</b>
                        Select safe trajectory
                    </div>

                </div>

            `;

        }

        else {

            content = `

                <p>
                    No critical obstacle is currently
                    forcing a trajectory change.
                </p>

                <div class="info-grid">

                    <div>
                        <span>STATUS</span>
                        <strong>
                            NOMINAL
                        </strong>
                    </div>

                    <div>
                        <span>BEHAVIOR</span>
                        <strong>
                            ${sim.behavior}
                        </strong>
                    </div>

                    <div>
                        <span>PLANNER</span>
                        <strong>
                            MONITORING
                        </strong>
                    </div>

                    <div>
                        <span>TRAJECTORY</span>
                        <strong>
                            SAFE
                        </strong>
                    </div>

                </div>

            `;

        }

    }


   else if (
    type ===
    "team"
) {

    title =
        "THE HORIZON";


    content = `

        <div class="team-panel">

            <div class="team-symbol">
                H
            </div>


            <h2>
                THE HORIZON
            </h2>


            <p>
                A student innovation team focused
                on intelligent mobility, autonomous
                systems and practical AI-driven
                solutions for real-world challenges.
            </p>


            <div class="team-tags">

                <span>AI</span>
                <span>ROBOTICS</span>
                <span>AUTONOMOUS SYSTEMS</span>
                <span>COMPUTER VISION</span>
                <span>PATH PLANNING</span>
                <span>INNOVATION</span>

            </div>


            <div class="team-members">

                <h3>
                    CORE TEAM
                </h3>


                <div class="member-grid">


                    <div class="member-card">
                        <div class="member-icon">K</div>
                        <div>
                            <b>Krish Kakkar</b>
                            <small>AI & System Developer</small>
                        </div>
                    </div>


                    <div class="member-card">
                        <div class="member-icon">K</div>
                        <div>
                            <b>Kashish</b>
                            <small>Innovation & Research</small>
                        </div>
                    </div>


                    <div class="member-card">
                        <div class="member-icon">K</div>
                        <div>
                            <b>Kartik</b>
                            <small>Technology Development</small>
                        </div>
                    </div>


                    <div class="member-card">
                        <div class="member-icon">K</div>
                        <div>
                            <b>Karan Singh</b>
                            <small>Engineering Support</small>
                        </div>
                    </div>


                    <div class="member-card">
                        <div class="member-icon">J</div>
                        <div>
                            <b>Jatin</b>
                            <small>Research & Testing</small>
                        </div>
                    </div>


                    <div class="member-card">
                        <div class="member-icon">K</div>
                        <div>
                            <b>Khanak</b>
                            <small>Creative & Documentation</small>
                        </div>
                    </div>


                </div>


            </div>


        </div>

    `;

}
    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "projectOverlay";

    overlay.className =
        "project-overlay";


    overlay.innerHTML = `

        <div
            class="project-modal"
            onclick="event.stopPropagation()"
        >

            <button
                class="modal-close"
                onclick="closeProjectPanel()"
            >
                ×
            </button>

            <div class="modal-kicker">
                ROAD SENSE // SIH 2026
            </div>

            <h2>
                ${title}
            </h2>

            <div class="modal-content">
                ${content}
            </div>

        </div>

    `;


    overlay.addEventListener(
        "click",
        closeProjectPanel
    );


    document.body.appendChild(
        overlay
    );


    requestAnimationFrame(
        () => {

            overlay.classList.add(
                "visible"
            );

        }
    );

}


function closeProjectPanel() {

    const overlay =
        document.getElementById(
            "projectOverlay"
        );


    if (
        !overlay
    ) {

        return;

    }


    overlay.classList.remove(
        "visible"
    );


    setTimeout(
        () => {

            overlay.remove();

        },
        220
    );

}


/* =========================================================
   THREE DOT MENU
========================================================= */

const menuButton =
    document.getElementById(
        "menuButton"
    );

const projectMenu =
    document.getElementById(
        "projectMenu"
    );


if (
    menuButton &&
    projectMenu
) {

    menuButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            projectMenu.classList.toggle(
                "active"
            );

        }
    );


    document.addEventListener(
        "click",
        () => {

            projectMenu.classList.remove(
                "active"
            );

        }
    );


    projectMenu.addEventListener(
        "click",
        event => {

            event.stopPropagation();

        }
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

loadScenario(
    "junction"
);

updateTelemetry();

updateSensorScan();

render();

requestAnimationFrame(
    animationLoop
);


/* =========================================================
   CONSOLE
========================================================= */

console.log(
    "%cROAD SENSE",
    "font-size:28px;font-weight:900;color:#00e5ff;"
);

console.log(
    "Adaptive Path Planning Simulation initialized."
);

console.log(
    "Behavior:",
    "CRUISE → CAUTION → BRAKE → AVOID → RECOVER → ARRIVED"
);
    /* =========================================================
   ROAD SENSE — PREMIUM INTRO SYSTEM
   MOBILE + DESKTOP SAFE
========================================================= */

(function initRoadSenseIntro() {

    function startIntro() {

        const intro =
            document.getElementById("introScreen");

        const status =
            document.getElementById("introStatusText");


        /* -------------------------------------------------
           SAFETY CHECK
        ------------------------------------------------- */

        if (!intro) {

            document.body.classList.remove(
                "intro-active"
            );

            return;

        }


        /* -------------------------------------------------
           LOCK PAGE SCROLL WHILE INTRO IS ACTIVE
        ------------------------------------------------- */

        document.body.classList.add(
            "intro-active"
        );


        /* -------------------------------------------------
           STATUS MESSAGES
        ------------------------------------------------- */

        const messages = [

            "INITIALIZING SENSOR FUSION...",

            "LOADING ADAPTIVE PLANNER...",

            "MAPPING DYNAMIC ROAD SPACE...",

            "PREDICTIVE RISK ENGINE ONLINE...",

            "ROAD SENSE ONLINE."

        ];


        messages.forEach(
            (message, index) => {

                setTimeout(
                    () => {

                        if (
                            status &&
                            document.body.contains(status)
                        ) {

                            status.textContent =
                                message;

                        }

                    },

                    index * 600

                );

            }
        );


        /* -------------------------------------------------
           MOBILE / DESKTOP MOTION DETECTION
        ------------------------------------------------- */

        let reducedMotion = false;

        try {

            reducedMotion =
                window.matchMedia &&
                window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches;

        }

        catch (error) {

            reducedMotion = false;

        }


        /* -------------------------------------------------
           INTRO DURATION
        ------------------------------------------------- */

        const introDuration =
            reducedMotion
                ? 1800
                : 4000;


        /* -------------------------------------------------
           EXIT INTRO
        ------------------------------------------------- */

        setTimeout(
            () => {

                if (!intro) {
                    return;
                }


                intro.classList.add(
                    "intro-hidden"
                );


                document.body.classList.remove(
                    "intro-active"
                );


                /* -----------------------------------------
                   REMOVE INTRO AFTER FADE
                ----------------------------------------- */

                setTimeout(
                    () => {

                        if (
                            intro &&
                            intro.parentNode
                        ) {

                            intro.parentNode.removeChild(
                                intro
                            );

                        }

                    },

                    1000

                );

            },

            introDuration

        );

    }


    /* =====================================================
       START SAFELY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startIntro,
            {
                once: true
            }
        );

    }

    else {

        startIntro();

    }

})();